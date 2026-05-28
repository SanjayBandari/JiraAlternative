import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../lib/api.js';
import { timeAgo } from '../../lib/utils.js';

const TYPE_ICON = {
  assigned:       '👤',
  comment:        '💬',
  status_changed: '🔄',
  due_soon:       '📅',
};

export default function NotificationPanel({ onClose, onRead }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    loadNotifications();
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const { notifications } = await notificationsApi.list();
      setNotifications(notifications || []);
    } catch (_) {}
    setLoading(false);
  }

  async function markAllRead() {
    await notificationsApi.readAll();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    onRead();
  }

  async function handleClick(n) {
    if (!n.is_read) {
      await notificationsApi.read(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
    onClose();
  }

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div ref={panelRef}
      className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm">
          Notifications {unread > 0 && <span className="text-brand-500">({unread} new)</span>}
        </h3>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="text-xs text-brand-500 hover:text-brand-700 transition-colors">
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm text-slate-400">You're all caught up!</p>
          </div>
        ) : (
          notifications.map(n => (
            <button key={n.id} onClick={() => handleClick(n)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0
                ${!n.is_read ? 'bg-brand-50/40' : ''}`}>
              <div className="flex gap-2 items-start">
                <span className="text-base flex-shrink-0">{TYPE_ICON[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.is_read ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
