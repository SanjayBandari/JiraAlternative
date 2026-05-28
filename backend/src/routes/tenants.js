import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/tenants/:tenantId — workspace details
router.get('/:tenantId', requireAuth, async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const { data: membership } = await supabaseAdmin
      .from('tenant_members').select('role')
      .eq('tenant_id', tenantId).eq('user_id', req.user.id).single();
    if (!membership) return res.status(403).json({ error: 'You are not a member of this workspace.' });

    const { data: tenant } = await supabaseAdmin
      .from('tenants').select('*').eq('id', tenantId).single();

    const { data: members } = await supabaseAdmin
      .from('tenant_members')
      .select('role, joined_at, user:profiles(id, full_name, email, avatar_url)')
      .eq('tenant_id', tenantId);

    res.json({ tenant, members, myRole: membership.role });
  } catch (err) { next(err); }
});

// PATCH /api/tenants/:tenantId — update workspace name/logo (admin only)
router.patch('/:tenantId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const updates = z.object({
      name:     z.string().min(1).optional(),
      logo_url: z.string().url().optional(),
    }).parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('tenants').update(updates).eq('id', req.params.tenantId).select().single();
    if (error) throw error;

    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/tenants/:tenantId/members/:userId — change a member's role
router.patch('/:tenantId/members/:userId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { role } = z.object({ role: z.enum(['admin', 'member', 'viewer']) }).parse(req.body);
    const { tenantId, userId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('tenant_members').update({ role })
      .eq('tenant_id', tenantId).eq('user_id', userId).select().single();
    if (error) throw error;

    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/tenants/:tenantId/members/:userId — remove a member
router.delete('/:tenantId/members/:userId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { tenantId, userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself from the workspace.' });
    }
    await supabaseAdmin.from('tenant_members')
      .delete().eq('tenant_id', tenantId).eq('user_id', userId);
    res.json({ message: 'Member removed.' });
  } catch (err) { next(err); }
});

export default router;
