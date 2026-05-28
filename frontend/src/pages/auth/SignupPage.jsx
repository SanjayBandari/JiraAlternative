import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function SignupPage() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const [form,    setForm]    = useState({ fullName: '', email: '', password: '', workspaceName: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    setLoading(true);
    try {
      await authApi.signup(form);
      await signIn(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">T</div>
          <h1 className="text-2xl font-bold text-slate-900">Create your workspace</h1>
          <p className="text-slate-500 mt-1">Free forever for up to 5 people</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
              <input type="text" required value={form.fullName}
                onChange={update('fullName')} placeholder="Jane Smith"
                className="input" autoFocus />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Work email</label>
              <input type="email" required value={form.email}
                onChange={update('email')} placeholder="jane@company.com"
                className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Workspace name</label>
              <input type="text" required value={form.workspaceName}
                onChange={update('workspaceName')} placeholder="Acme Corp"
                className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="password" required value={form.password}
                onChange={update('password')} placeholder="8+ characters"
                className="input" />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full">
              {loading ? 'Creating workspace…' : 'Create workspace'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have a workspace?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
