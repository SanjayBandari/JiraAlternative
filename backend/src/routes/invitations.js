import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sendInviteEmail } from '../services/email.js';

const router = Router();

// POST /api/invitations — send invite
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { tenantId, email, role } = z.object({
      tenantId: z.string().uuid(),
      email:    z.string().email(),
      role:     z.enum(['admin', 'member', 'viewer']).default('member'),
    }).parse(req.body);

    // Check not already a member
    const { data: existing } = await supabaseAdmin
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', (await supabaseAdmin.from('profiles').select('id').eq('email', email).single())?.data?.id || 'none')
      .single();
    if (existing) return res.status(400).json({ error: 'This person is already a member of your workspace.' });

    const { data: invite, error } = await supabaseAdmin.from('invitations').upsert({
      tenant_id:  tenantId,
      email,
      role,
      invited_by: req.user.id,
      accepted_at: null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'tenant_id,email' }).select().single();
    if (error) throw error;

    const { data: inviter } = await supabaseAdmin
      .from('profiles').select('full_name').eq('id', req.user.id).single();
    const { data: tenant } = await supabaseAdmin
      .from('tenants').select('name').eq('id', tenantId).single();

    await sendInviteEmail({
      to: email,
      inviterName:   inviter?.full_name || 'A teammate',
      workspaceName: tenant?.name       || 'your workspace',
      token:         invite.token,
    });

    res.status(201).json({ message: `Invitation sent to ${email}.` });
  } catch (err) { next(err); }
});

// POST /api/invitations/accept — accept an invite (no auth required — user may be new)
router.post('/accept', async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);

    const { data: invite } = await supabaseAdmin
      .from('invitations').select('*').eq('token', token).single();
    if (!invite) return res.status(404).json({ error: 'This invite link is invalid or has already been used.' });
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This invite has expired. Ask your admin to send a new one.' });
    }
    if (invite.accepted_at) {
      return res.status(400).json({ error: 'This invite has already been accepted.' });
    }

    res.json({
      tenantId:  invite.tenant_id,
      email:     invite.email,
      role:      invite.role,
      inviteId:  invite.id,
    });
  } catch (err) { next(err); }
});

// POST /api/invitations/complete — after user signs up via invite
router.post('/complete', requireAuth, async (req, res, next) => {
  try {
    const { inviteId } = z.object({ inviteId: z.string().uuid() }).parse(req.body);

    const { data: invite } = await supabaseAdmin
      .from('invitations').select('*').eq('id', inviteId).single();
    if (!invite) return res.status(404).json({ error: 'Invite not found.' });

    // Add to tenant
    await supabaseAdmin.from('tenant_members').insert({
      tenant_id:  invite.tenant_id,
      user_id:    req.user.id,
      role:       invite.role,
      invited_by: invite.invited_by,
    });

    // Mark accepted
    await supabaseAdmin.from('invitations')
      .update({ accepted_at: new Date().toISOString() }).eq('id', inviteId);

    res.json({ message: 'Welcome to the workspace!', tenantId: invite.tenant_id });
  } catch (err) { next(err); }
});

export default router;
