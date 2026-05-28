import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

import LoginPage         from './pages/auth/LoginPage.jsx';
import SignupPage        from './pages/auth/SignupPage.jsx';
import AcceptInvitePage  from './pages/auth/AcceptInvitePage.jsx';
import OnboardingPage    from './pages/OnboardingPage.jsx';
import DashboardPage     from './pages/DashboardPage.jsx';
import KanbanPage        from './pages/KanbanPage.jsx';
import TicketDetailPage  from './pages/TicketDetailPage.jsx';
import TeamPage          from './pages/TeamPage.jsx';
import SettingsPage      from './pages/SettingsPage.jsx';
import AppLayout         from './components/layout/AppLayout.jsx';

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { session, memberships, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"          element={!session ? <LoginPage />   : <Navigate to="/" replace />} />
      <Route path="/signup"         element={!session ? <SignupPage />  : <Navigate to="/" replace />} />
      <Route path="/accept-invite"  element={<AcceptInvitePage />} />

      {/* Protected */}
      <Route path="/" element={
        <ProtectedRoute>
          {memberships.length === 0
            ? <Navigate to="/onboarding" replace />
            : <Navigate to="/dashboard" replace />
          }
        </ProtectedRoute>
      } />

      <Route path="/onboarding" element={
        <ProtectedRoute><OnboardingPage /></ProtectedRoute>
      } />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard"        element={<DashboardPage />} />
        <Route path="/board"            element={<KanbanPage />} />
        <Route path="/tickets/:id"      element={<TicketDetailPage />} />
        <Route path="/team"             element={<TeamPage />} />
        <Route path="/settings"         element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
