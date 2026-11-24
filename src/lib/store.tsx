import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { DB, Profile, Workspace } from './types';
import { audit, emptyDB, uid } from './db';
import { loadCloudDB, persistChanges } from './cloud';
import { supabase } from './supabase';

interface Store {
  db: DB; user: Profile | null; workspaces: Workspace[];
  loading: boolean; loadError: string | null;
  refresh: () => Promise<void>;
  login: (email: string, pw: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, pw: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  mutate: (fn: (db: DB) => void, action?: string, entity?: string, id?: string, ws?: string) => void;
  toast: string | null; setToast: (t: string | null) => void;
}

const Ctx = createContext<Store>(null as any);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [toast, setToast] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const generation = useRef(0);
  const writeQueue = useRef(Promise.resolve());

  const hydrate = async (session: Session, currentGeneration: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await loadCloudDB(session);
      if (currentGeneration !== generation.current) return;
      setDb(loaded);
      setUserId(session.user.id);
    } catch (error) {
      if (currentGeneration !== generation.current) return;
      setLoadError(error instanceof Error ? error.message : 'Could not load data from Supabase.');
    } finally {
      if (currentGeneration === generation.current) setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        const currentGeneration = ++generation.current;
        if (session) {
          void hydrate(session, currentGeneration);
        } else {
          setDb(emptyDB());
          setUserId(null);
          setLoadError(null);
          setLoading(false);
        }
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4200); return () => clearTimeout(t); }
  }, [toast]);

  const refresh = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setLoadError(error.message);
      return;
    }
    if (!data.session) {
      setDb(emptyDB());
      setUserId(null);
      setLoadError(null);
      setLoading(false);
      return;
    }
    const currentGeneration = ++generation.current;
    await hydrate(data.session, currentGeneration);
  };

  const user: Profile | null = useMemo(() => db.profiles.find(p => p.id === userId) || null, [db, userId]);
  const workspaces = useMemo(() => db.workspaces.filter(w => db.workspace_members.some(m => m.workspace_id === w.id && m.user_id === userId)), [db, userId]);

  const login = async (email: string, pw: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    return error ? { ok: false, error: error.message } : { ok: true };
  };

  const register = async (name: string, email: string, pw: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: { data: { full_name: name.trim() } },
    });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      message: data.session ? 'Account created. Your finance workspaces are ready.' : 'Account created. Check your email to confirm your address, then sign in.',
    };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return error ? { ok: false, error: error.message } : { ok: true };
  };

  const changePassword = async (current: string, next: string) => {
    if (!user?.email) return { ok: false, error: 'No signed-in email address was found.' };
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (verifyError) return { ok: false, error: 'Current password is incorrect.' };
    const { error } = await supabase.auth.updateUser({ password: next });
    return error ? { ok: false, error: error.message } : { ok: true };
  };

  const logout = () => {
    void supabase.auth.signOut().then(({ error }) => {
      if (error) setToast(`Could not sign out: ${error.message}`);
    });
  };

  const mutate = (fn: (db: DB) => void, action?: string, entity?: string, id?: string, ws?: string) => {
    if (!userId) return;
    const previous = db;
    const next: DB = JSON.parse(JSON.stringify(db));
    fn(next);
    if (action) audit(next, userId, action, entity || 'record', id || uid(), ws);
    setDb(next);
    writeQueue.current = writeQueue.current
      .then(() => persistChanges(previous, next))
      .catch(error => {
        const message = error instanceof Error ? error.message : 'Unknown database error.';
        setToast(`Could not save to Supabase: ${message}`);
        void refresh();
      });
  };

  return <Ctx.Provider value={{
    db, user, workspaces, loading, loadError, refresh, login, register, resetPassword,
    changePassword, logout, mutate, toast, setToast,
  }}>{children}</Ctx.Provider>;
}
