import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'ejecutiva' | 'asesor' | 'dialer' | 'recicladora' | 'aliado';

const SESSION_KEY = 'lp_crm_session';
const API_BASE = window.location.origin;

interface OtpSession {
  token: string;
  user: { id: string; email: string; role: AppRole; fullName: string };
  exp: number;
}

function getStoredSession(): OtpSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: OtpSession = JSON.parse(raw);
    if (session.exp < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const lastFetchedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Check OTP session first
    const otpSession = getStoredSession();
    if (otpSession) {
      const fakeUser = { id: otpSession.user.id, email: otpSession.user.email } as User;
      setUser(fakeUser);
      setRole(otpSession.user.role as AppRole);
      setFullName(otpSession.user.fullName);
      setLoading(false);
      return;
    }

    // Fallback to Supabase auth (for existing sessions)
    let cancelled = false;

    async function fetchRoleAndProfile(userId: string) {
      if (lastFetchedUserId.current === userId) return;
      lastFetchedUserId.current = userId;

      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('profiles').select('full_name').eq('user_id', userId).single(),
      ]);
      if (cancelled) return;
      const roles = (roleData ?? []).map(r => r.role as AppRole);
      setRole(roles.includes('admin') ? 'admin' : roles[0] ?? null);
      setFullName(profileData?.full_name ?? '');
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchRoleAndProfile(currentUser.id);
        } else {
          lastFetchedUserId.current = null;
          setRole(null);
          setFullName('');
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchRoleAndProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const sendOtp = async (email: string) => {
    const r = await fetch(`${API_BASE}/api/otp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await r.json();
    return { error: r.ok ? null : data.error || 'Error enviando codigo' };
  };

  const verifyOtp = async (email: string, code: string) => {
    const r = await fetch(`${API_BASE}/api/otp-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await r.json();
    if (!r.ok) return { error: { message: data.error || 'Codigo invalido' } };

    const session: OtpSession = {
      token: data.token,
      user: data.user,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    const fakeUser = { id: data.user.id, email: data.user.email } as User;
    setUser(fakeUser);
    setRole(data.user.role as AppRole);
    setFullName(data.user.fullName);

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      (async () => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', data.user.id)
          .single();
        const name = profileData?.full_name ?? email;
        const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
        await supabase.functions.invoke('send-task-email', {
          body: {
            to: 'vicente@llavepropia.cl',
            subject: `CRM: ${name} acaba de ingresar`,
            html: `<p><strong>${name}</strong> (${email}) acaba de iniciar sesion en el CRM de Llave Propia.</p><p>Hora: ${now}</p>`,
          },
        });
      })().catch(console.error);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setFullName('');
  };

  return { user, role, fullName, loading, signIn, signUp, signOut, sendOtp, verifyOtp };
}
