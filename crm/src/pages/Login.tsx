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
      <div className="min-h-screen flex items-center justify-center bg-[#080810] px-6">
        {/* Grid bg */}
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="pointer-events-none fixed left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[100px]" />

        <div className="relative w-full max-w-sm text-center space-y-6 animate-slide-up">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.5)] mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.09 12.26a1 1 0 0 0 .79 1.62h7.23l-1.1 7.91L20.1 11.7a1 1 0 0 0-.74-1.62h-7.07L13 2z"/></svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Lead<span className="text-orange-500">Flash</span>
          </h1>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-6 space-y-3 backdrop-blur">
            <p className="text-base font-bold text-white">Optimizado para escritorio</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              LeadFlash está diseñado para ofrecer la mejor experiencia en un computador de escritorio o notebook.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Inicia sesión desde un computador para acceder a todas las funcionalidades.
            </p>
          </div>
          <a href="/" className="inline-block text-sm text-orange-400 font-bold hover:text-orange-300 transition">
            ← Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#080810]">
      {/* Grid background */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Left panel – branding */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_50%,rgba(249,115,22,0.08),transparent)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-orange-500/6 blur-[100px]" />

        {/* Logo + back */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.09 12.26a1 1 0 0 0 .79 1.62h7.23l-1.1 7.91L20.1 11.7a1 1 0 0 0-.74-1.62h-7.07L13 2z"/></svg>
            </div>
            <span className="text-xl font-black text-white">Lead<span className="text-orange-500">Flash</span></span>
          </div>
          <a href="/" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
            Volver al inicio
          </a>
        </div>

        {/* Center copy */}
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/8 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-orange-300">Sistema activo</span>
          </div>
          <h2 className="text-4xl font-black leading-tight text-white">
            Cada lead,<br />
            una <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">oportunidad</span>.
          </h2>
          <p className="text-slate-400 leading-relaxed max-w-sm">
            Accede a tu panel de operaciones y gestiona cada lead en tiempo real.
          </p>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { value: '<3s', label: 'Lead en pantalla' },
              { value: '+30%', label: 'Tasa de cierre' },
              { value: '24/7', label: 'Flujo activo' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/6 bg-white/3 p-3 text-center">
                <p className="text-xl font-black text-orange-400">{s.value}</p>
                <p className="mt-1 text-[11px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-slate-600">© {new Date().getFullYear()} LeadFlash</p>
      </div>

      {/* Right panel – form */}
      <div className="relative flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute right-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-orange-500/6 blur-[120px]" />

        <div className="relative w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.09 12.26a1 1 0 0 0 .79 1.62h7.23l-1.1 7.91L20.1 11.7a1 1 0 0 0-.74-1.62h-7.07L13 2z"/></svg>
            </div>
            <span className="text-xl font-black text-white">Lead<span className="text-orange-500">Flash</span></span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-white">Bienvenido de vuelta</h1>
            <p className="mt-1.5 text-sm text-slate-400">Inicia sesión para acceder al panel</p>
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
                className="h-12 rounded-xl border-white/8 bg-white/4 text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:ring-orange-500/20 transition"
                style={{ WebkitTextFillColor: 'white', WebkitBoxShadow: '0 0 0 1000px #0c0c16 inset' }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contraseña</label>
              <Input
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-12 rounded-xl border-white/8 bg-white/4 text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:ring-orange-500/20 transition"
                style={{ WebkitTextFillColor: 'white', WebkitBoxShadow: '0 0 0 1000px #0c0c16 inset' }}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-12 rounded-xl bg-orange-500 text-base font-black text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] transition hover:bg-orange-400 hover:shadow-[0_0_36px_rgba(249,115,22,0.5)] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  Cargando...
                </span>
              ) : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-600">
            ¿Necesitas acceso?{' '}
            <a href="https://wa.me/56994366697" target="_blank" rel="noopener noreferrer" className="text-orange-400 font-semibold hover:text-orange-300 transition">
              Contáctanos
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
