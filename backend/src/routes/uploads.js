import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';

const router = Router();

// POST /api/uploads/sign — get a signed upload URL from Supabase Storage
router.post('/sign', requireAuth, async (req, res, next) => {
  try {
    const { tenantId, ticketId, fileName, mimeType, fileSize } = z.object({
      tenantId: z.string().uuid(),
      ticketId: z.string().uuid(),
      fileName: z.string().min(1),
      mimeType: z.string(),
      fileSize: z.number().max(10 * 1024 * 1024, 'File must be 10 MB or smaller.'),
    }).parse(req.body);

    const safeName    = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${tenantId}/${ticketId}/${Date.now()}_${safeName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('attachments')
      .createSignedUploadUrl(storagePath);
    if (error) throw error;

    res.json({ signedUrl: data.signedUrl, storagePath, token: data.token });
  } catch (err) { next(err); }
});

// POST /api/uploads/confirm — record attachment after successful upload
router.post('/confirm', requireAuth, async (req, res, next) => {
  try {
    const { tenantId, ticketId, commentId, fileName, fileSize, mimeType, storagePath } = z.object({
      tenantId:    z.string().uuid(),
      ticketId:    z.string().uuid(),
      commentId:   z.string().uuid().optional(),
      fileName:    z.string(),
      fileSize:    z.number(),
      mimeType:    z.string(),
      storagePath: z.string(),
    }).parse(req.body);

    const { data, error } = await supabaseAdmin.from('attachments').insert({
      tenant_id:   tenantId,
      ticket_id:   ticketId,
      comment_id:  commentId || null,
      uploaded_by: req.user.id,
      file_name:   fileName,
      file_size:   fileSize,
      mime_type:   mimeType,
      storage_path: storagePath,
    }).select().single();
    if (error) throw error;

    await logActivity({ tenantId, ticketId, actorId: req.user.id, verb: 'attachment_added',
      toValue: fileName });

    res.status(201).json(data);
  } catch (err) { next(err); }
});

// GET /api/uploads/url?path= — get a signed download URL
router.get('/url', requireAuth, async (req, res, next) => {
  try {
    const { path } = z.object({ path: z.string() }).parse(req.query);
    const { data, error } = await supabaseAdmin.storage
      .from('attachments').createSignedUrl(path, 3600);
    if (error) throw error;
    res.json({ url: data.signedUrl });
  } catch (err) { next(err); }
});

// DELETE /api/uploads/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: att } = await supabaseAdmin
      .from('attachments').select('*').eq('id', req.params.id).single();
    if (!att) return res.status(404).json({ error: 'Attachment not found.' });

    await supabaseAdmin.storage.from('attachments').remove([att.storage_path]);
    await supabaseAdmin.from('attachments').delete().eq('id', req.params.id);
    res.json({ message: 'Attachment deleted.' });
  } catch (err) { next(err); }
});

export default router;
