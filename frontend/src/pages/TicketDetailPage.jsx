import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketsApi, commentsApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, VERB_LABELS, formatDate, timeAgo } from '../lib/utils.js';
import { Avatar } from '../components/layout/AppLayout.jsx';
import FileUpload from '../components/tickets/FileUpload.jsx';

export default function TicketDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { currentTenant, profile, myRole } = useAuth();

  const [ticket,    setTicket]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [comment,   setComment]   = useState('');
  const [showDelete,setShowDelete]= useState(false);
  const [members,   setMembers]   = useState([]);
  const commentRef = useRef(null);

  useEffect(() => { loadTicket(); }, [id]);

  async function loadTicket() {
    setLoading(true);
    try {
      const t = await ticketsApi.get(id);
      setTicket(t);
    } catch (_) {
      navigate('/dashboard');
    }
    setLoading(false);
  }

  async function updateField(field, value) {
    setSaving(true);
    try {
      const updated = await ticketsApi.update(id, { [field]: value });
      setTicket(prev => ({ ...prev, ...updated }));
    } catch (_) {}
    setSaving(false);
  }

  async function postComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const c = await commentsApi.create({ ticketId: id, body: comment });
      setTicket(prev => ({ ...prev, comments: [...(prev.comments || []), c] }));
      setComment('');
    } catch (_) {}
  }

  async function deleteTicket() {
    await ticketsApi.delete(id);
    navigate('/dashboard');
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!ticket) return null;

  const canEdit = myRole !== 'viewer';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
        <button onClick={() => navigate(-1)} className="hover:text-slate-800 transition-colors">← Back</button>
        <span>/</span>
        <span className="text-slate-400">{ticket.project?.name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Title */}
          <div className="card p-5">
            {canEdit ? (
              <input
                defaultValue={ticket.title}
                onBlur={e => { if (e.target.value !== ticket.title) updateField('title', e.target.value); }}
                className="text-xl font-bold text-slate-900 w-full border-0 p-0 focus:outline-none focus:ring-0 bg-transparent"
              />
            ) : (
              <h1 className="text-xl font-bold text-slate-900">{ticket.title}</h1>
            )}

            {canEdit ? (
              <textarea
                defaultValue={ticket.description || ''}
                onBlur={e => { if (e.target.value !== ticket.description) updateField('description', e.target.value); }}
                placeholder="Add a description…"
                rows={4}
                className="mt-3 w-full border-0 p-0 text-sm text-slate-600 focus:outline-none resize-none bg-transparent placeholder:text-slate-300"
              />
            ) : (
              <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
                {ticket.description || <span className="text-slate-300 italic">No description</span>}
              </p>
            )}
          </div>

          {/* Attachments */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Attachments</h3>
            {ticket.attachments?.length > 0 ? (
              <div className="space-y-2 mb-3">
                {ticket.attachments.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                    <span>📎</span>
                    <span className="flex-1 truncate">{a.file_name}</span>
                    <span className="text-xs text-slate-400">
                      {a.file_size ? `${(a.file_size / 1024).toFixed(0)} KB` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-3">No files attached yet.</p>
            )}
            {canEdit && <FileUpload ticketId={id} tenantId={currentTenant.id} onUploaded={loadTicket} />}
          </div>

          {/* Comments */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">
              Comments {ticket.comments?.length > 0 && `(${ticket.comments.length})`}
            </h3>

            <div className="space-y-4 mb-4">
              {(ticket.comments || []).length === 0 && (
                <p className="text-sm text-slate-400 italic">No comments yet. Be the first!</p>
              )}
              {(ticket.comments || []).map(c => (
                <CommentItem key={c.id} comment={c} currentUserId={profile?.id}
                  onDelete={cid => setTicket(prev => ({
                    ...prev,
                    comments: prev.comments.filter(x => x.id !== cid),
                  }))} />
              ))}
            </div>

            {canEdit && (
              <form onSubmit={postComment} className="space-y-2">
                <textarea
                  ref={commentRef}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment…"
                  rows={3}
                  className="input resize-none"
                />
                <button type="submit" disabled={!comment.trim()} className="btn-primary text-sm">
                  Post comment
                </button>
              </form>
            )}
          </div>

          {/* Activity log */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Activity</h3>
            <div className="space-y-3">
              {(ticket.activity_log || []).map(a => {
                const actorName = a.actor?.full_name || 'Someone';
                const label = VERB_LABELS[a.verb]?.(actorName, a.from_value, a.to_value) || `${actorName} made a change`;
                return (
                  <div key={a.id} className="flex gap-3 items-start">
                    <Avatar name={a.actor?.full_name} url={a.actor?.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-600">{label}</p>
                      <p className="text-xs text-slate-400">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              {(ticket.activity_log || []).length === 0 && (
                <p className="text-sm text-slate-400 italic">No activity recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-64 space-y-4">
          <div className="card p-4 space-y-4">
            <Field label="Status">
              {canEdit ? (
                <select value={ticket.status}
                  onChange={e => updateField('status', e.target.value)}
                  className="input text-sm">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              ) : (
                <span className={`badge ${STATUS_CONFIG[ticket.status]?.color}`}>
                  {STATUS_CONFIG[ticket.status]?.label}
                </span>
              )}
            </Field>

            <Field label="Priority">
              {canEdit ? (
                <select value={ticket.priority}
                  onChange={e => updateField('priority', e.target.value)}
                  className="input text-sm">
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              ) : (
                <span className={`badge ${PRIORITY_CONFIG[ticket.priority]?.color}`}>
                  {PRIORITY_CONFIG[ticket.priority]?.label}
                </span>
              )}
            </Field>

            <Field label="Category">
              {canEdit ? (
                <select value={ticket.category}
                  onChange={e => updateField('category', e.target.value)}
                  className="input text-sm">
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              ) : (
                <span className={`badge ${CATEGORY_CONFIG[ticket.category]?.color}`}>
                  {CATEGORY_CONFIG[ticket.category]?.label}
                </span>
              )}
            </Field>

            <Field label="Due date">
              {canEdit ? (
                <input type="date"
                  value={ticket.due_date || ''}
                  onChange={e => updateField('dueDate', e.target.value || null)}
                  className="input text-sm" />
              ) : (
                <span className="text-sm text-slate-600">{formatDate(ticket.due_date) || '—'}</span>
              )}
            </Field>

            <Field label="Project">
              <span className="text-sm text-slate-600">{ticket.project?.name || '—'}</span>
            </Field>

            <Field label="Created">
              <span className="text-sm text-slate-400">{timeAgo(ticket.created_at)}</span>
            </Field>

            {ticket.resolved_at && (
              <Field label="Resolved">
                <span className="text-sm text-green-600">{timeAgo(ticket.resolved_at)}</span>
              </Field>
            )}
          </div>

          {saving && (
            <p className="text-xs text-brand-500 text-center animate-pulse">Saving…</p>
          )}

          {/* Danger zone */}
          {(myRole === 'admin' || myRole === 'member') && (
            <div className="card p-4 border-red-100">
              {!showDelete ? (
                <button onClick={() => setShowDelete(true)}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors w-full text-left">
                  🗑 Delete ticket
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700 font-medium">Delete this ticket?</p>
                  <p className="text-xs text-slate-400">This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={deleteTicket} className="btn-danger text-sm flex-1">Delete</button>
                    <button onClick={() => setShowDelete(false)} className="btn-secondary text-sm flex-1">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  );
}

function CommentItem({ comment, currentUserId, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const canDelete = comment.author_id === currentUserId;

  async function handleDelete() {
    try {
      await commentsApi.delete(comment.id);
      onDelete(comment.id);
    } catch (_) {}
  }

  return (
    <div className={`flex gap-3 group ${comment.is_resolution ? 'bg-green-50 rounded-lg p-2 -mx-2' : ''}`}>
      <Avatar name={comment.author?.full_name} url={comment.author?.avatar_url} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-700">{comment.author?.full_name}</span>
          <span className="text-xs text-slate-400">{timeAgo(comment.created_at)}</span>
          {comment.is_resolution && (
            <span className="badge bg-green-100 text-green-700 text-xs">✓ Resolution</span>
          )}
        </div>
        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{comment.body}</p>
      </div>
      {canDelete && (
        <button onClick={handleDelete}
          className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs self-start mt-1">
          ✕
        </button>
      )}
    </div>
  );
}
