import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ticketsApi, projectsApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { STATUS_CONFIG, PRIORITY_CONFIG, isOverdue, formatDate } from '../lib/utils.js';
import NewTicketModal from '../components/tickets/NewTicketModal.jsx';
import { Avatar } from '../components/layout/AppLayout.jsx';

const COLUMNS = ['todo', 'in_progress', 'review', 'done'];

export default function KanbanPage() {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [tickets,   setTickets]   = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [newStatus, setNewStatus] = useState('todo');
  const [activeId,  setActiveId]  = useState(null);
  const [filterProj,setFilterProj]= useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => { if (currentTenant) loadData(); }, [currentTenant]);

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

  function ticketsForColumn(status) {
    return tickets
      .filter(t => t.status === status && (!filterProj || t.project_id === filterProj))
      .sort((a, b) => a.position - b.position);
  }

  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  async function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const draggedTicket = tickets.find(t => t.id === active.id);
    if (!draggedTicket) return;

    // Determine target column from the over container id or a ticket's status
    const overTicket = tickets.find(t => t.id === over.id);
    const newStatus  = overTicket ? overTicket.status : over.id;

    if (!COLUMNS.includes(newStatus)) return;

    // Optimistic update
    setTickets(prev => prev.map(t =>
      t.id === active.id ? { ...t, status: newStatus } : t
    ));

    try {
      await ticketsApi.update(active.id, { status: newStatus });
    } catch (_) {
      // Rollback
      setTickets(prev => prev.map(t =>
        t.id === active.id ? { ...t, status: draggedTicket.status } : t
      ));
    }
  }

  const activeTicket = tickets.find(t => t.id === activeId);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Board</h1>
        <div className="flex gap-2">
          <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
            className="input text-sm w-44">
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => { setNewStatus('todo'); setShowNew(true); }}
            className="btn-primary flex items-center gap-1">
            <span>+</span> New Ticket
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map(status => {
            const cfg = STATUS_CONFIG[status];
            const col = ticketsForColumn(status);
            return (
              <Column key={status} id={status} status={status} cfg={cfg} tickets={col}
                onAddClick={() => { setNewStatus(status); setShowNew(true); }}
                onTicketClick={id => navigate(`/tickets/${id}`)}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTicket && <KanbanCard ticket={activeTicket} isDragging />}
        </DragOverlay>
      </DndContext>

      {showNew && (
        <NewTicketModal
          tenantId={currentTenant.id}
          projects={projects}
          defaultStatus={newStatus}
          onClose={() => setShowNew(false)}
          onCreated={t => { setTickets(prev => [t, ...prev]); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function Column({ id, status, cfg, tickets, onAddClick, onTicketClick }) {
  return (
    <div className="bg-slate-100 rounded-xl p-3 min-h-[200px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className="text-sm font-semibold text-slate-700">{cfg.label}</span>
          <span className="text-xs text-slate-400 bg-slate-200 rounded-full px-1.5">{tickets.length}</span>
        </div>
        <button onClick={onAddClick}
          className="w-6 h-6 rounded-md hover:bg-slate-200 text-slate-500 flex items-center justify-center text-lg leading-none transition-colors">
          +
        </button>
      </div>

      <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tickets.map(ticket => (
            <SortableCard key={ticket.id} ticket={ticket} onClick={() => onTicketClick(ticket.id)} />
          ))}
        </div>
      </SortableContext>

      {tickets.length === 0 && (
        <button onClick={onAddClick}
          className="w-full mt-2 border-2 border-dashed border-slate-300 rounded-lg p-3 text-xs text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-colors">
          + Add ticket
        </button>
      )}
    </div>
  );
}

function SortableCard({ ticket, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-40' : ''}>
      <KanbanCard ticket={ticket} onClick={onClick} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function KanbanCard({ ticket, onClick, dragHandleProps, isDragging }) {
  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const overdue  = isOverdue(ticket.due_date) && ticket.status !== 'done';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-3 shadow-sm border border-slate-200 cursor-pointer
        hover:shadow-md hover:border-brand-200 transition-all group
        ${isDragging ? 'shadow-lg rotate-1 scale-105' : ''}`}
      {...(dragHandleProps || {})}
    >
      {/* Category / priority row */}
      <div className="flex items-center justify-between mb-2">
        <span className={`badge text-xs ${priority.color}`}>
          {priority.icon} {priority.label}
        </span>
        {ticket.project && (
          <span className="text-xs text-slate-400 truncate max-w-[80px]">
            {ticket.project.name}
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">{ticket.title}</p>

      {/* Footer row */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1">
          {ticket.due_date && (
            <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
              {overdue ? '⚠' : '📅'} {formatDate(ticket.due_date)}
            </span>
          )}
        </div>
        {ticket.assignee && (
          <Avatar name={ticket.assignee.full_name} url={ticket.assignee.avatar_url} size="sm" />
        )}
      </div>
    </div>
  );
}
