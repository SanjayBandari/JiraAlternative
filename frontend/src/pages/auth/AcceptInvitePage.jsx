import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { invitationsApi, authApi } from '../../lib/api.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AcceptInvitePage() {
  const [params]   = useSearchParams();
  const token      = params.get('token');
  const navigate   = useNavigate();
  const { session, refreshProfile } = useAuth();

  const [invite,  setInvite]  = useState(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const [mode,    setMode]    = useState('loading'); // loading | signup | login | joining
  const [form,    setForm]    = useState({ fullName: '', password: '' });

  useEffect(() => {
    async function lookupInvite() {
      if (!token) { setError('Invalid invite link.'); setLoading(false); return; }
      try {
        const data = await invitationsApi.lookup(token);
        setInvite(data);
        setMode(session ? 'joining' : 'signup');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    lookupInvite();
  }, [token, session]);

  async function joinWorkspace(inviteId) {
    try {
      await invitationsApi.complete(inviteId);
      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (mode === 'joining' && invite?.inviteId) {
      joinWorkspace(invite.inviteId);
    }
  }, [mode, invite]);

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.signup({ email: invite.email, password: form.password,
        fullName: form.fullName, workspaceName: '__invite__' });
      const { error } = await supabase.auth.signInWithPassword({ email: invite.email, password: form.password });
      if (error) throw error;
      await joinWorkspace(invite.inviteId);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <p className="text-3xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Invite issue</h2>
        <p className="text-slate-500 mb-4">{error}</p>
        <a href="/login" className="btn-primary inline-block">Go to login</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="card p-6">
          <div className="text-center mb-6">
            <p className="text-4xl mb-3">🎉</p>
            <h1 className="text-xl font-bold text-slate-900">You're invited!</h1>
            <p className="text-slate-500 mt-1">Create an account to join your workspace as <strong>{invite?.role}</strong>.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
              <input type="text" required value={form.fullName}
                onChange={e => setForm(f => ({...f, fullName: e.target.value}))}
                placeholder="Jane Smith" className="input" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={invite?.email} disabled className="input opacity-60 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Create a password</label>
              <input type="password" required value={form.password}
                onChange={e => setForm(f => ({...f, password: e.target.value}))}
                placeholder="8+ characters" className="input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Joining…' : 'Accept & join workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
