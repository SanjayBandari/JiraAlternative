import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { authApi } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session,     setSession]     = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile();
      else { setProfile(null); setMemberships([]); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile() {
    try {
      const { profile, memberships } = await authApi.me();
      setProfile(profile);
      setMemberships(memberships || []);
    } catch (_) {}
    setLoading(false);
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const currentTenant = memberships[0]?.tenant || null;
  const myRole = memberships[0]?.role || null;

  return (
    <AuthContext.Provider value={{
      session, profile, memberships,
      currentTenant, myRole, loading,
      signIn, signOut, refreshProfile: loadProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
