import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/projects?tenantId=
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { tenantId } = z.object({ tenantId: z.string().uuid() }).parse(req.query);

    const { data, error } = await supabaseAdmin
      .from('projects').select('*, created_by:profiles(id, full_name, avatar_url)')
      .eq('tenant_id', tenantId).order('created_at', { ascending: true });
    if (error) throw error;

    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/projects
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      tenantId:    z.string().uuid(),
      name:        z.string().min(1),
      description: z.string().optional(),
      color:       z.string().optional(),
    }).parse(req.body);

    const { data, error } = await supabaseAdmin.from('projects').insert({
      tenant_id:   body.tenantId,
      name:        body.name,
      description: body.description,
      color:       body.color || '#6366f1',
      created_by:  req.user.id,
    }).select().single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err) { next(err); }
});

// PATCH /api/projects/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const updates = z.object({
      name:        z.string().min(1).optional(),
      description: z.string().optional(),
      color:       z.string().optional(),
    }).parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('projects').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await supabaseAdmin.from('projects').delete().eq('id', req.params.id);
    res.json({ message: 'Project deleted.' });
  } catch (err) { next(err); }
});

export default router;
