import { createClient } from '@supabase/supabase-js';

// Admin client — uses service_role key, bypasses RLS
// Only used server-side for privileged operations (sending invites, etc.)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Create a user-scoped client from a JWT (respects RLS)
export function supabaseForUser(accessToken) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    }
  );
}
