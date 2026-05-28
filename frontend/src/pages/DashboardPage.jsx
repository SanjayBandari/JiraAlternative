import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ticketsApi, projectsApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { STATUS_CONFIG, PRIORITY_CONFIG, formatDate, isOverdue, timeAgo } from '../lib/utils.js';
import NewTicketModal from '../components/tickets/NewTicketModal.jsx';
import { Avatar } from '../components/layout/AppLayout.jsx';

const VIEWS = [
  { id: 'mine',     label: 'My Tickets' },
  { id: 'team',     label: 'Team Tickets' },
  { id: 'overdue',  label: 'Overdue' },
  { id: 'recent',   label: 'Recently Updated' },
];

export default function DashboardPage() {
  const { currentTenant, profile } = useAuth();
  const navigate = useNavigate();
  const [tickets,    setTickets]    = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [view,       setView]       = useState('mine');
  const [loading,    setLoading]    = useState(true);
  const [showNew,    setShowNew]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [filterPri,  setFilterPri]  = useState('');
  const [filterProj, setFilterProj] = useState('');

  useEffect(() => { if (currentTenant) { loadData(); } }, [currentTenant]);

  async function loadData() {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([
        ticketsApi.list({ tenantId: currentTenant.id }),
        projectsApi.list(currentTenant.id),
      ]);
      setTickets(t);
      setProjects(p);
    } catch (_) {}
    setLoading(false);
  }

  const filtered = tickets.filter(t => {
    if (view === 'mine'    && t.assignee_id !== profile?.id) return false;
    if (view === 'overdue' && !isOverdue(t.due_date))        return false;
    if (filterPri  && t.priority   !== filterPri)            return false;
    if (filterProj && t.project_id !== filterProj)           return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (view === 'recent') return new Date(b.updated_at) - new Date(a.updated_at);
    return 0;
  });

  const stats = {
    open:       tickets.filter(t => t.status === 'todo').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    review:     tickets.filter(t => t.status === 'review').length,
    done:       tickets.filter(t => t.status === 'done').length,
    overdue:    tickets.filter(t => isOverdue(t.due_date) && t.status !== 'done').length,
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {currentTenant?.name} · {tickets.length} total tickets
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <span className="text-lg leading-none">+</span> New Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'To Do',       value: stats.open,       color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600',  bg: 'bg-blue-50'  },
          { label: 'In Review',   value: stats.review,     color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Done',        value: stats.done,       color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Overdue',     value: stats.overdue,    color: 'text-red-600',   bg: 'bg-red-50'   },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* View tabs + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap
                ${view === v.id ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-1">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets…" className="input flex-1 text-sm" />

          <select value={filterPri} onChange={e => setFilterPri(e.target.value)}
            className="input w-36 text-sm">
            <option value="">All priorities</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
            className="input w-40 text-sm">
            <option value="">All projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ticket list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading tickets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">
              {view === 'overdue' ? '🎉' : search ? '🔍' : '📋'}
            </p>
            <p className="font-medium text-slate-700">
              {view === 'overdue' ? 'No overdue tickets — nice work!'
               : search ? 'No tickets match your search'
               : 'No tickets here yet'}
            </p>
            {!search && (
              <button onClick={() => setShowNew(true)}
                className="btn-primary mt-4 text-sm">
                Create your first ticket
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(ticket => (
              <TicketRow key={ticket.id} ticket={ticket}
                onClick={() => navigate(`/tickets/${ticket.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewTicketModal
          tenantId={currentTenant.id}
          projects={projects}
          onClose={() => setShowNew(false)}
          onCreated={t => { setTickets(prev => [t, ...prev]); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function TicketRow({ ticket, onClick }) {
  const status   = STATUS_CONFIG[ticket.status]   || STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const overdue  = isOverdue(ticket.due_date) && ticket.status !== 'done';

  return (
    <button onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3">
      {/* Status dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status.dot}`} />

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{ticket.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {ticket.project?.name} · {timeAgo(ticket.updated_at)}
        </p>
      </div>

      {/* Priority */}
      <span className={`badge ${priority.color} hidden sm:inline-flex`}>
        {priority.icon} {priority.label}
      </span>

      {/* Status */}
      <span className={`badge ${status.color} hidden md:inline-flex`}>{status.label}</span>

      {/* Due date */}
      {ticket.due_date && (
        <span className={`text-xs font-medium hidden lg:block ${overdue ? 'text-red-600' : 'text-slate-400'}`}>
          {overdue ? '⚠ ' : ''}{formatDate(ticket.due_date)}
        </span>
      )}

      {/* Assignee */}
      {ticket.assignee && (
        <Avatar name={ticket.assignee.full_name} url={ticket.assignee.avatar_url} size="sm" />
      )}
    </button>
  );
}
