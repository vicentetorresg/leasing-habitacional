import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const TABLET_BREAKPOINT = 1024;

function useIsSmallScreen() {
  const [isSmall, setIsSmall] = useState(() => window.innerWidth < TABLET_BREAKPOINT);
  useEffect(() => {
    const handler = () => setIsSmall(window.innerWidth < TABLET_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isSmall;
}

const Login = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isSmallScreen = useIsSmallScreen();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  if (isSmallScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(135deg, #0F1E3D 0%, #1B3A6B 50%, #143052 100%)' }}>
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="pointer-events-none fixed left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2DB89E]/10 blur-[100px]" />

        <div className="relative w-full max-w-sm text-center space-y-6 animate-slide-up">
          <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" className="h-12 mx-auto" />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3 backdrop-blur">
            <p className="text-base font-bold text-white">Optimizado para escritorio</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              El CRM de Llave Propia esta disenado para ofrecer la mejor experiencia en un computador de escritorio o notebook.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Inicia sesion desde un computador para acceder a todas las funcionalidades.
            </p>
          </div>
          <a href="https://www.llavepropia.cl" className="inline-block text-sm text-[#2DB89E] font-bold hover:text-[#3ACFB8] transition">
            Volver a llavepropia.cl
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0F1E3D 0%, #1B3A6B 50%, #143052 100%)' }}>
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Left panel */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_50%,rgba(45,184,158,0.08),transparent)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#2DB89E]/6 blur-[100px]" />

        <div className="relative flex items-center justify-between">
          <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" className="h-10" />
          <a href="https://www.llavepropia.cl" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
            llavepropia.cl
          </a>
        </div>

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2DB89E]/25 bg-[#2DB89E]/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2DB89E] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2DB89E]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#2DB89E]">CRM Activo</span>
          </div>
          <h2 className="text-4xl font-black leading-tight text-white">
            Tu casa propia,<br />
            mas <span className="bg-gradient-to-r from-[#2DB89E] to-[#3ACFB8] bg-clip-text text-transparent">cerca</span>.
          </h2>
          <p className="text-slate-400 leading-relaxed max-w-sm">
            Gestiona leads, documentos y procesos de Leasing Habitacional en un solo lugar.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { value: 'DS120', label: 'Leasing Habitacional' },
              { value: '100%', label: 'Sin pie inicial' },
              { value: '24/7', label: 'Seguimiento activo' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/6 bg-white/3 p-3 text-center">
                <p className="text-xl font-black text-[#2DB89E]">{s.value}</p>
                <p className="mt-1 text-[11px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">&copy; {new Date().getFullYear()} Llave Propia</p>
      </div>

      {/* Right panel */}
      <div className="relative flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute right-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-[#C9871A]/8 blur-[120px]" />

        <div className="relative w-full max-w-sm animate-slide-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" className="h-9" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-white">Bienvenido de vuelta</h1>
            <p className="mt-1.5 text-sm text-slate-400">Inicia sesion para acceder al CRM</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</label>
              <Input
                type="email"
                placeholder="Ingresa tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                className="h-12 rounded-xl border-white/8 bg-white/4 text-white placeholder:text-slate-600 focus:border-[#2DB89E]/50 focus:ring-[#2DB89E]/20 transition"
                style={{ WebkitTextFillColor: 'white', WebkitBoxShadow: '0 0 0 1000px #0c1a35 inset' }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contrasena</label>
              <Input
                type="password"
                placeholder="Ingresa tu contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-12 rounded-xl border-white/8 bg-white/4 text-white placeholder:text-slate-600 focus:border-[#2DB89E]/50 focus:ring-[#2DB89E]/20 transition"
                style={{ WebkitTextFillColor: 'white', WebkitBoxShadow: '0 0 0 1000px #0c1a35 inset' }}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-12 rounded-xl text-base font-black text-white shadow-[0_0_24px_rgba(45,184,158,0.3)] transition hover:shadow-[0_0_36px_rgba(45,184,158,0.45)] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2DB89E 0%, #1B9E85 100%)' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  Cargando...
                </span>
              ) : 'Iniciar sesion'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-600">
            Necesitas acceso?{' '}
            <a href="https://wa.me/56962078510" target="_blank" rel="noopener noreferrer" className="text-[#2DB89E] font-semibold hover:text-[#3ACFB8] transition">
              Contactanos
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
