import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi, ticketsApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const STEPS = ['Create a project', 'Create your first ticket', 'Invite your team'];

export default function OnboardingPage() {
  const { currentTenant, refreshProfile } = useAuth();
  const navigate  = useNavigate();
  const [step,    setStep]    = useState(0);
  const [project, setProject] = useState(null);
  const [pName,   setPName]   = useState('');
  const [tTitle,  setTTitle]  = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function createProject(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const p = await projectsApi.create({ tenantId: currentTenant.id, name: pName });
      setProject(p);
      setStep(1);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function createTicket(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await ticketsApi.create({ tenantId: currentTenant.id, projectId: project.id, title: tTitle });
      setStep(2);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  function finish() {
    refreshProfile();
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 ${i < step ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card p-6">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm mb-4">{error}</div>
          )}

          {step === 0 && (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Create a project</h2>
              <p className="text-slate-500 text-sm mb-4">Projects group your tickets. Start with one area of work.</p>
              <form onSubmit={createProject} className="space-y-4">
                <input type="text" required value={pName} onChange={e => setPName(e.target.value)}
                  placeholder="e.g. Website Redesign, Mobile App, Customer Support…"
                  className="input" autoFocus />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Creating…' : 'Create project →'}
                </button>
              </form>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Create your first ticket</h2>
              <p className="text-slate-500 text-sm mb-4">A ticket is any task, bug, or idea you want to track.</p>
              <form onSubmit={createTicket} className="space-y-4">
                <input type="text" required value={tTitle} onChange={e => setTTitle(e.target.value)}
                  placeholder="e.g. Fix login bug, Add dark mode, Write onboarding copy…"
                  className="input" autoFocus />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Creating…' : 'Create ticket →'}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Invite your team</h2>
              <p className="text-slate-500 text-sm mb-4">You can invite teammates from Settings → Team after this step.</p>
              <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 mb-4 text-sm text-brand-700">
                🎉 You're all set! Your workspace is ready. Go invite your team from the Team page.
              </div>
              <button onClick={finish} className="btn-primary w-full">
                Go to my dashboard →
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
      </div>
    </div>
  );
}
