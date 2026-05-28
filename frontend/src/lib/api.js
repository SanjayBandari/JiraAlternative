import { supabase } from './supabase.js';

const BASE = '/api';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function request(method, path, body = null) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  delete: (path)         => request('DELETE', path),
};

// ── Tickets ────────────────────────────────────────────────
export const ticketsApi = {
  list:    (params) => api.get(`/tickets?${new URLSearchParams(params)}`),
  get:     (id)     => api.get(`/tickets/${id}`),
  create:  (body)   => api.post('/tickets', body),
  update:  (id, b)  => api.patch(`/tickets/${id}`, b),
  delete:  (id)     => api.delete(`/tickets/${id}`),
  reorder: (updates)=> api.patch('/tickets/bulk/reorder', { updates }),
};

// ── Projects ───────────────────────────────────────────────
export const projectsApi = {
  list:   (tenantId) => api.get(`/projects?tenantId=${tenantId}`),
  create: (body)     => api.post('/projects', body),
  update: (id, b)    => api.patch(`/projects/${id}`, b),
  delete: (id)       => api.delete(`/projects/${id}`),
};

// ── Comments ───────────────────────────────────────────────
export const commentsApi = {
  create: (body)   => api.post('/comments', body),
  update: (id, b)  => api.patch(`/comments/${id}`, b),
  delete: (id)     => api.delete(`/comments/${id}`),
};

// ── Notifications ──────────────────────────────────────────
export const notificationsApi = {
  list:    ()   => api.get('/notifications'),
  readAll: ()   => api.patch('/notifications/read-all', {}),
  read:    (id) => api.patch(`/notifications/${id}/read`, {}),
};

// ── Tenants ────────────────────────────────────────────────
export const tenantsApi = {
  get:          (id)      => api.get(`/tenants/${id}`),
  update:       (id, b)   => api.patch(`/tenants/${id}`, b),
  updateMember: (tid, uid, b) => api.patch(`/tenants/${tid}/members/${uid}`, b),
  removeMember: (tid, uid)    => api.delete(`/tenants/${tid}/members/${uid}`),
};

// ── Invitations ────────────────────────────────────────────
export const invitationsApi = {
  send:     (body)  => api.post('/invitations', body),
  lookup:   (token) => api.post('/invitations/accept', { token }),
  complete: (inviteId) => api.post('/invitations/complete', { inviteId }),
};

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  me:            ()    => api.get('/auth/me'),
  signup:        (b)   => api.post('/auth/signup', b),
  updateProfile: (b)   => api.patch('/auth/profile', b),
};
