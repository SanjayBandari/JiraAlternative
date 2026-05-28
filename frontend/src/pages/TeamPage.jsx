import { useState, useEffect } from 'react';
import { tenantsApi, invitationsApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from '../components/layout/AppLayout.jsx';
import { timeAgo } from '../lib/utils.js';

const ROLE_BADGE = {
  admin:  'bg-purple-100 text-purple-700',
  member: 'bg-blue-100 text-blue-600',
  viewer: 'bg-slate-100 text-slate-500',
};

export default function TeamPage() {
  const { currentTenant, myRole, profile } = useAuth();
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [invEmail, setInvEmail] = useState('');
  const [invRole,  setInvRole]  = useState('member');
  const [sending,  setSending]  = useState(false);
  const [message,  setMessage]  = useState('');
  const [error,    setError]    = useState('');

  useEffect(() => { if (currentTenant) loadTeam(); }, [currentTenant]);

  async function loadTeam() {
    setLoading(true);
    try {
      const { members } = await tenantsApi.get(currentTenant.id);
      setMembers(members || []);
    } catch (_) {}
    setLoading(false);
  }

  async function sendInvite(e) {
    e.preventDefault();
    setError(''); setMessage('');
    setSending(true);
    try {
      await invitationsApi.send({ tenantId: currentTenant.id, email: invEmail, role: invRole });
      setMessage(`Invitation sent to ${invEmail}!`);
      setInvEmail('');
    } catch (err) {
      setError(err.message);
    }
    setSending(false);
  }

  async function changeRole(userId, role) {
    try {
      await tenantsApi.updateMember(currentTenant.id, userId, { role });
      setMembers(prev => prev.map(m => m.user?.id === userId ? { ...m, role } : m));
    } catch (_) {}
  }

  async function removeMember(userId) {
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await tenantsApi.removeMember(currentTenant.id, userId);
      setMembers(prev => prev.filter(m => m.user?.id !== userId));
    } catch (_) {}
  }

  const isAdmin = myRole === 'admin';

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Team</h1>

      {/* Invite form */}
      {isAdmin && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Invite a teammate</h2>
          {message && (
            <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 text-sm mb-3">{message}</div>
          )}
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm mb-3">{error}</div>
          )}
          <form onSubmit={sendInvite} className="flex gap-2">
            <input type="email" required value={invEmail}
              onChange={e => setInvEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="input flex-1 text-sm" />
            <select value={invRole} onChange={e => setInvRole(e.target.value)}
              className="input w-32 text-sm">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" disabled={sending} className="btn-primary text-sm whitespace-nowrap">
              {sending ? 'Sending…' : 'Send invite'}
            </button>
          </form>
          <div className="mt-3 text-xs text-slate-400 space-y-0.5">
            <p><strong>Admin</strong> — full workspace control</p>
            <p><strong>Member</strong> — create and edit tickets</p>
            <p><strong>Viewer</strong> — read-only access</p>
          </div>
        </div>
      )}

      {/* Member list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{members.length} member{members.length !== 1 ? 's' : ''}</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map(m => (
              <div key={m.user?.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={m.user?.full_name} url={m.user?.avatar_url} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {m.user?.full_name || '—'}
                    {m.user?.id === profile?.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-400">{m.user?.email}</p>
                </div>

                <span className={`badge ${ROLE_BADGE[m.role]}`}>{m.role}</span>

                {isAdmin && m.user?.id !== profile?.id && (
                  <div className="flex gap-1">
                    <select value={m.role}
                      onChange={e => changeRole(m.user.id, e.target.value)}
                      className="input text-xs py-1 w-28">
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button onClick={() => removeMember(m.user.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove member">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
