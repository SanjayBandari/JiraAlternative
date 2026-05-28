import { useState } from 'react';
import { ticketsApi, tenantsApi } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function NewTicketModal({ tenantId, projects, defaultStatus = 'todo', onClose, onCreated }) {
  const { currentTenant } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', status: defaultStatus,
    priority: 'medium', category: 'task',
    projectId: projects[0]?.id || '',
    assigneeId: '', dueDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('A title is required.');
    if (!form.projectId)    return setError('Please select a project.');
    setError('');
    setLoading(true);
    try {
      const ticket = await ticketsApi.create({
        tenantId,
        projectId:   form.projectId,
        title:       form.title,
        description: form.description || undefined,
        status:      form.status,
        priority:    form.priority,
        category:    form.category,
        assigneeId:  form.assigneeId || undefined,
        dueDate:     form.dueDate    || undefined,
      });
      onCreated(ticket);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">New Ticket</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-400">*</span></label>
            <input type="text" required value={form.title} onChange={update('title')}
              placeholder="What needs to be done?" className="input" autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={update('description')}
              placeholder="Add details, steps to reproduce, etc."
              className="input resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
              <select value={form.projectId} onChange={update('projectId')} className="input text-sm">
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={update('status')} className="input text-sm">
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={form.priority} onChange={update('priority')} className="input text-sm">
                <option value="low">↓ Low</option>
                <option value="medium">→ Medium</option>
                <option value="high">↑ High</option>
                <option value="urgent">⚡ Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={update('category')} className="input text-sm">
                <option value="task">✓ Task</option>
                <option value="bug">🐛 Bug</option>
                <option value="feature">✦ Feature</option>
                <option value="question">? Question</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
            <input type="date" value={form.dueDate} onChange={update('dueDate')} className="input text-sm" />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating…' : 'Create ticket'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
