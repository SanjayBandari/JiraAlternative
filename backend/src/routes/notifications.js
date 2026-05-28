import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*, ticket:tickets(id, title)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    const unreadCount = data.filter(n => !n.is_read).length;
    res.json({ notifications: data, unreadCount });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', requireAuth, async (req, res, next) => {
  try {
    await supabaseAdmin.from('notifications')
      .update({ is_read: true }).eq('user_id', req.user.id).eq('is_read', false);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await supabaseAdmin.from('notifications')
      .update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) { next(err); }
});

export default router;
