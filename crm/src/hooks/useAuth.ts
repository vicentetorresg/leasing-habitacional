import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'ejecutiva' | 'asesor' | 'dialer' | 'recicladora';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          // Fetch role with setTimeout to avoid deadlock
          setTimeout(async () => {
            const [{ data: roleData }, { data: profileData }] = await Promise.all([
              supabase.from('user_roles').select('role').eq('user_id', currentUser.id),
              supabase.from('profiles').select('full_name').eq('user_id', currentUser.id).single(),
            ]);
            const roles = (roleData ?? []).map(r => r.role as AppRole);
            setRole(roles.includes('admin') ? 'admin' : roles[0] ?? null);
            setFullName(profileData?.full_name ?? '');
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setFullName('');
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', currentUser.id),
          supabase.from('profiles').select('full_name').eq('user_id', currentUser.id).single(),
        ]).then(([{ data: roleData }, { data: profileData }]) => {
          const roles = (roleData ?? []).map(r => r.role as AppRole);
          setRole(roles.includes('admin') ? 'admin' : roles[0] ?? null);
          setFullName(profileData?.full_name ?? '');
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && data.user) {
      // Notify owner on every team login — fire and forget
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
            html: `<p><strong>${name}</strong> (${email}) acaba de iniciar sesión en el CRM de Llave Propia.</p><p>Hora: ${now}</p>`,
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
    await supabase.auth.signOut();
  };

  return { user, role, fullName, loading, signIn, signUp, signOut };
}
