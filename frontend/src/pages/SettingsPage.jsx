import { useState } from 'react';
import { authApi, tenantsApi, projectsApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function SettingsPage() {
  const { profile, currentTenant, myRole, refreshProfile } = useAuth();

  const [profileForm, setProfileForm] = useState({ fullName: profile?.full_name || '' });
  const [wsForm,      setWsForm]      = useState({ name: currentTenant?.name || '' });
  const [profMsg,     setProfMsg]     = useState('');
  const [wsMsg,       setWsMsg]       = useState('');
  const [saving,      setSaving]      = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.updateProfile({ fullName: profileForm.fullName });
      await refreshProfile();
      setProfMsg('Profile updated!');
    } catch (err) {
      setProfMsg(err.message);
    }
    setSaving(false);
    setTimeout(() => setProfMsg(''), 3000);
  }

  async function saveWorkspace(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await tenantsApi.update(currentTenant.id, { name: wsForm.name });
      setWsMsg('Workspace updated!');
    } catch (err) {
      setWsMsg(err.message);
    }
    setSaving(false);
    setTimeout(() => setWsMsg(''), 3000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* Profile */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Your profile</h2>
        <form onSubmit={saveProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display name</label>
            <input type="text" value={profileForm.fullName}
              onChange={e => setProfileForm({ fullName: e.target.value })}
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={profile?.email} disabled
              className="input opacity-60 cursor-not-allowed" />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed here.</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            {profMsg && <span className="text-sm text-green-600">{profMsg}</span>}
          </div>
        </form>
      </div>

      {/* Workspace */}
      {myRole === 'admin' && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Workspace settings</h2>
          <form onSubmit={saveWorkspace} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Workspace name</label>
              <input type="text" value={wsForm.name}
                onChange={e => setWsForm({ name: e.target.value })}
                className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Workspace ID</label>
              <input type="text" value={currentTenant?.id} disabled
                className="input opacity-60 cursor-not-allowed font-mono text-xs" />
              <p className="text-xs text-slate-400 mt-1">Use this when connecting external tools.</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving…' : 'Save workspace'}
              </button>
              {wsMsg && <span className="text-sm text-green-600">{wsMsg}</span>}
            </div>
          </form>
        </div>
      )}

      {/* Plan info */}
      <div className="card p-5 bg-gradient-to-br from-brand-50 to-white border-brand-100">
        <h2 className="font-semibold text-slate-800 mb-1">Free plan</h2>
        <p className="text-sm text-slate-500 mb-3">1 project, up to 5 members — free forever.</p>
        <div className="inline-block bg-brand-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium opacity-60 cursor-default">
          Upgrade to Pro — coming soon
        </div>
      </div>
    </div>
  );
}
