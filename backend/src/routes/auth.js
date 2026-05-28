import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup — create account + workspace in one step
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, fullName, workspaceName } = z.object({
      email:         z.string().email(),
      password:      z.string().min(8, 'Password must be at least 8 characters'),
      fullName:      z.string().min(1),
      workspaceName: z.string().min(1),
    }).parse(req.body);

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (authError) throw { status: 400, message: authError.message };

    const userId = authData.user.id;

    // 2. Create tenant
    const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants').insert({ name: workspaceName, slug }).select().single();
    if (tenantError) throw { status: 400, message: 'Workspace name already taken — try another.' };

    // 3. Add user as admin
    await supabaseAdmin.from('tenant_members').insert({
      tenant_id: tenant.id, user_id: userId, role: 'admin',
    });

    res.status(201).json({ message: 'Account created! You can now sign in.', tenantId: tenant.id });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/auth/me — return current user + their tenants
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('*').eq('id', req.user.id).single();

    const { data: memberships } = await supabaseAdmin
      .from('tenant_members')
      .select('role, tenant:tenants(id, name, slug, logo_url)')
      .eq('user_id', req.user.id);

    res.json({ profile, memberships });
  } catch (err) { next(err); }
});

// PATCH /api/auth/profile — update display name / avatar
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { fullName, avatarUrl } = z.object({
      fullName:  z.string().min(1).optional(),
      avatarUrl: z.string().url().optional(),
    }).parse(req.body);

    const updates = {};
    if (fullName)  updates.full_name  = fullName;
    if (avatarUrl) updates.avatar_url = avatarUrl;

    const { data, error } = await supabaseAdmin
      .from('profiles').update(updates).eq('id', req.user.id).select().single();
    if (error) throw error;

    res.json(data);
  } catch (err) { next(err); }
});

export default router;
