import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/activity?ticketId=
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { ticketId } = req.query;
    if (!ticketId) return res.status(400).json({ error: 'ticketId is required' });

    const { data, error } = await supabaseAdmin
      .from('activity_log')
      .select('*, actor:profiles(id, full_name, avatar_url)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    res.json(data);
  } catch (err) { next(err); }
});

export default router;
