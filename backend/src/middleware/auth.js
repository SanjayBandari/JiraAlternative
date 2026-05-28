import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Verifies the Supabase JWT in the Authorization header.
 * Attaches req.user and req.accessToken for downstream use.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  req.user        = data.user;
  req.accessToken = token;
  next();
}

/**
 * Checks that the current user is an admin of the given tenant.
 * Expects req.params.tenantId or req.body.tenantId.
 */
export async function requireAdmin(req, res, next) {
  const tenantId = req.params.tenantId || req.body.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required.' });

  const { data } = await supabaseAdmin
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', req.user.id)
    .single();

  if (data?.role !== 'admin') {
    return res.status(403).json({ error: 'Only workspace admins can do that.' });
  }
  next();
}
