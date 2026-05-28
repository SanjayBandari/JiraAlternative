import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Appends a row to the activity_log table.
 * Call this from any route that modifies a ticket.
 */
export async function logActivity({
  tenantId, ticketId, actorId, verb, fromValue = null, toValue = null, meta = null,
}) {
  const { error } = await supabaseAdmin.from('activity_log').insert({
    tenant_id:  tenantId,
    ticket_id:  ticketId,
    actor_id:   actorId,
    verb,
    from_value: fromValue,
    to_value:   toValue,
    meta,
  });
  if (error) console.error('[activity] log failed:', error.message);
}

/**
 * Creates an in-app notification for a user.
 */
export async function createNotification({
  tenantId, userId, ticketId, type, title, body = null,
}) {
  const { error } = await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    user_id:   userId,
    ticket_id: ticketId,
    type,
    title,
    body,
  });
  if (error) console.error('[notification] create failed:', error.message);
}
