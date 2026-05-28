import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity, createNotification } from '../services/activity.js';
import { sendCommentNotificationEmail } from '../services/email.js';

const router = Router();

// POST /api/comments
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { ticketId, body, parentId } = z.object({
      ticketId: z.string().uuid(),
      body:     z.string().min(1),
      parentId: z.string().uuid().optional(),
    }).parse(req.body);

    const { data: ticket } = await supabaseAdmin
      .from('tickets').select('tenant_id, title, created_by, assignee_id').eq('id', ticketId).single();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const { data: comment, error } = await supabaseAdmin.from('comments').insert({
      ticket_id:  ticketId,
      tenant_id:  ticket.tenant_id,
      author_id:  req.user.id,
      body,
      parent_id:  parentId || null,
    }).select('*, author:profiles(id, full_name, avatar_url)').single();
    if (error) throw error;

    await logActivity({ tenantId: ticket.tenant_id, ticketId, actorId: req.user.id, verb: 'commented' });

    // Notify ticket owner and assignee (if not the commenter)
    const { data: actor } = await supabaseAdmin
      .from('profiles').select('full_name').eq('id', req.user.id).single();

    const notifyUsers = [...new Set([ticket.created_by, ticket.assignee_id])]
      .filter(uid => uid && uid !== req.user.id);

    await Promise.all(notifyUsers.map(async uid => {
      await createNotification({
        tenantId: ticket.tenant_id, userId: uid,
        ticketId, type: 'comment',
        title: `${actor?.full_name || 'Someone'} commented on ${ticket.title}`,
        body: body.slice(0, 120),
      });
      const { data: recipient } = await supabaseAdmin
        .from('profiles').select('full_name, email').eq('id', uid).single();
      if (recipient?.email) {
        await sendCommentNotificationEmail({
          to: recipient.email, recipientName: recipient.full_name,
          commenterName: actor?.full_name || 'A teammate',
          ticketTitle: ticket.title, ticketId, commentBody: body,
        });
      }
    }));

    res.status(201).json(comment);
  } catch (err) { next(err); }
});

// PATCH /api/comments/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { body, isResolution } = z.object({
      body:         z.string().min(1).optional(),
      isResolution: z.boolean().optional(),
    }).parse(req.body);

    const updates = {};
    if (body !== undefined)         updates.body          = body;
    if (isResolution !== undefined) updates.is_resolution = isResolution;

    const { data, error } = await supabaseAdmin
      .from('comments').update(updates)
      .eq('id', req.params.id).eq('author_id', req.user.id)
      .select().single();
    if (error) throw error;

    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/comments/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await supabaseAdmin.from('comments').delete()
      .eq('id', req.params.id).eq('author_id', req.user.id);
    res.json({ message: 'Comment deleted.' });
  } catch (err) { next(err); }
});

export default router;
