import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { notificationsApi } from '../../lib/api.js';
import NotificationPanel from '../ui/NotificationPanel.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦'  },
  { to: '/board',     label: 'Board',     icon: '⊞'  },
  { to: '/team',      label: 'Team',      icon: '👥' },
  { to: '/settings',  label: 'Settings',  icon: '⚙'  },
];

export default function AppLayout() {
  const { profile, currentTenant, signOut } = useAuth();
  const navigate = useNavigate();
  const [unread,       setUnread]       = useState(0);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  useEffect(() => {
    notificationsApi.list().then(({ unreadCount }) => setUnread(unreadCount)).catch(() => {});
    const interval = setInterval(() => {
      notificationsApi.list().then(({ unreadCount }) => setUnread(unreadCount)).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden"
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-60 bg-white border-r border-slate-200 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">T</div>
            <div>
              <p className="font-semibold text-sm text-slate-900">TicketDesk</p>
              <p className="text-xs text-slate-400 truncate max-w-[120px]">{currentTenant?.name}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                   ? 'bg-brand-50 text-brand-600'
                   : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar name={profile?.full_name} url={profile?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'You'}</p>
              <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
            </div>
            <button onClick={signOut}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              title="Sign out">⏻</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(s => !s)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600">
            ☰
          </button>
          <div className="flex-1" />
          {/* Notification bell */}
          <div className="relative">
            <button onClick={() => setShowNotifs(v => !v)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
              🔔
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white
                                 text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {showNotifs && (
              <NotificationPanel
                onClose={() => setShowNotifs(false)}
                onRead={() => setUnread(0)}
              />
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function Avatar({ name, url, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return url
    ? <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
    : <div className={`${sizes[size]} rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold flex-shrink-0`}>{initials}</div>;
}
