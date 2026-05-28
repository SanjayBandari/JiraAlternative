import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity, createNotification } from '../services/activity.js';
import { sendTicketAssignedEmail } from '../services/email.js';

const router = Router();

const TicketSchema = z.object({
  tenantId:    z.string().uuid(),
  projectId:   z.string().uuid(),
  title:       z.string().min(1),
  description: z.string().optional(),
  status:      z.enum(['todo','in_progress','review','done']).optional(),
  priority:    z.enum(['low','medium','high','urgent']).optional(),
  category:    z.enum(['bug','task','feature','question']).optional(),
  assigneeId:  z.string().uuid().nullable().optional(),
  dueDate:     z.string().nullable().optional(),
});

// GET /api/tickets?tenantId=&projectId=&status=&priority=&assigneeId=&search=
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { tenantId, projectId, status, priority, assigneeId, search } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    let query = supabaseAdmin
      .from('tickets')
      .select(`
        *,
        assignee:profiles!tickets_assignee_id_fkey(id, full_name, avatar_url, email),
        created_by_profile:profiles!tickets_created_by_fkey(id, full_name, avatar_url),
        project:projects(id, name, color)
      `)
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (projectId)  query = query.eq('project_id', projectId);
    if (status)     query = query.eq('status', status);
    if (priority)   query = query.eq('priority', priority);
    if (assigneeId) query = query.eq('assignee_id', assigneeId);
    if (search)     query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/tickets/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        assignee:profiles!tickets_assignee_id_fkey(id, full_name, avatar_url, email),
        created_by_profile:profiles!tickets_created_by_fkey(id, full_name, avatar_url),
        project:projects(id, name, color),
        comments(
          *, author:profiles(id, full_name, avatar_url),
          attachments(*)
        ),
        attachments(*),
        activity_log(*, actor:profiles(id, full_name, avatar_url))
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Ticket not found.' });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/tickets
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = TicketSchema.parse(req.body);

    const { data: ticket, error } = await supabaseAdmin.from('tickets').insert({
      tenant_id:   body.tenantId,
      project_id:  body.projectId,
      title:       body.title,
      description: body.description,
      status:      body.status     || 'todo',
      priority:    body.priority   || 'medium',
      category:    body.category   || 'task',
      assignee_id: body.assigneeId || null,
      due_date:    body.dueDate    || null,
      created_by:  req.user.id,
    }).select().single();
    if (error) throw error;

    await logActivity({
      tenantId: body.tenantId, ticketId: ticket.id,
      actorId: req.user.id, verb: 'created',
    });

    // Notify assignee
    if (body.assigneeId && body.assigneeId !== req.user.id) {
      const { data: assignee } = await supabaseAdmin
        .from('profiles').select('full_name, email').eq('id', body.assigneeId).single();
      const { data: project } = await supabaseAdmin
        .from('projects').select('name').eq('id', body.projectId).single();

      await createNotification({
        tenantId: body.tenantId, userId: body.assigneeId,
        ticketId: ticket.id, type: 'assigned',
        title: `You were assigned: ${body.title}`,
      });
      if (assignee?.email) {
        await sendTicketAssignedEmail({
          to: assignee.email, assigneeName: assignee.full_name,
          ticketTitle: body.title, ticketId: ticket.id,
          projectName: project?.name || 'a project',
        });
      }
    }

    res.status(201).json(ticket);
  } catch (err) { next(err); }
});

// PATCH /api/tickets/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const updates = z.object({
      title:       z.string().min(1).optional(),
      description: z.string().optional(),
      status:      z.enum(['todo','in_progress','review','done']).optional(),
      priority:    z.enum(['low','medium','high','urgent']).optional(),
      category:    z.enum(['bug','task','feature','question']).optional(),
      assigneeId:  z.string().uuid().nullable().optional(),
      dueDate:     z.string().nullable().optional(),
      position:    z.number().optional(),
    }).parse(req.body);

    // Fetch current state for diffing
    const { data: existing } = await supabaseAdmin
      .from('tickets').select('*').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Ticket not found.' });

    const dbUpdates = {};
    if (updates.title       !== undefined) dbUpdates.title       = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status      !== undefined) dbUpdates.status      = updates.status;
    if (updates.priority    !== undefined) dbUpdates.priority    = updates.priority;
    if (updates.category    !== undefined) dbUpdates.category    = updates.category;
    if (updates.assigneeId  !== undefined) dbUpdates.assignee_id = updates.assigneeId;
    if (updates.dueDate     !== undefined) dbUpdates.due_date    = updates.dueDate;
    if (updates.position    !== undefined) dbUpdates.position    = updates.position;
    if (updates.status === 'done')         dbUpdates.resolved_at = new Date().toISOString();
    if (updates.status && updates.status !== 'done') dbUpdates.resolved_at = null;

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets').update(dbUpdates).eq('id', req.params.id).select().single();
    if (error) throw error;

    // Log meaningful changes
    const tenantId = existing.tenant_id;
    if (updates.status && updates.status !== existing.status) {
      await logActivity({ tenantId, ticketId: ticket.id, actorId: req.user.id,
        verb: 'status_changed', fromValue: existing.status, toValue: updates.status });
      await createNotification({ tenantId, userId: existing.created_by,
        ticketId: ticket.id, type: 'status_changed',
        title: `Ticket status changed to ${updates.status.replace('_',' ')}`,
        body: existing.title });
    }
    if (updates.priority && updates.priority !== existing.priority) {
      await logActivity({ tenantId, ticketId: ticket.id, actorId: req.user.id,
        verb: 'priority_changed', fromValue: existing.priority, toValue: updates.priority });
    }
    if (updates.assigneeId !== undefined && updates.assigneeId !== existing.assignee_id) {
      await logActivity({ tenantId, ticketId: ticket.id, actorId: req.user.id,
        verb: updates.assigneeId ? 'assigned' : 'unassigned',
        toValue: updates.assigneeId });
      if (updates.assigneeId && updates.assigneeId !== req.user.id) {
        const { data: assignee } = await supabaseAdmin
          .from('profiles').select('full_name, email').eq('id', updates.assigneeId).single();
        await createNotification({ tenantId, userId: updates.assigneeId,
          ticketId: ticket.id, type: 'assigned',
          title: `You were assigned: ${existing.title}` });
        if (assignee?.email) {
          const { data: project } = await supabaseAdmin
            .from('projects').select('name').eq('id', existing.project_id).single();
          await sendTicketAssignedEmail({
            to: assignee.email, assigneeName: assignee.full_name,
            ticketTitle: existing.title, ticketId: ticket.id,
            projectName: project?.name || 'a project',
          });
        }
      }
    }
    if (updates.dueDate !== undefined && updates.dueDate !== existing.due_date) {
      await logActivity({ tenantId, ticketId: ticket.id, actorId: req.user.id,
        verb: 'due_date_changed', fromValue: existing.due_date, toValue: updates.dueDate });
    }

    res.json(ticket);
  } catch (err) { next(err); }
});

// DELETE /api/tickets/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await supabaseAdmin.from('tickets').delete().eq('id', req.params.id);
    res.json({ message: 'Ticket deleted.' });
  } catch (err) { next(err); }
});

// PATCH /api/tickets/reorder — bulk position update for kanban drag
router.patch('/bulk/reorder', requireAuth, async (req, res, next) => {
  try {
    const { updates } = z.object({
      updates: z.array(z.object({ id: z.string().uuid(), position: z.number(), status: z.string() }))
    }).parse(req.body);

    await Promise.all(updates.map(u =>
      supabaseAdmin.from('tickets').update({ position: u.position, status: u.status }).eq('id', u.id)
    ));
    res.json({ message: 'Reordered.' });
  } catch (err) { next(err); }
});

export default router;
