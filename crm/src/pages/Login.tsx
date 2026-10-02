import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const TABLET_BREAKPOINT = 1024;
const API_BASE = window.location.origin;
const SESSION_KEY = 'lp_crm_session';

const CRM_USERS = [
  { id: '0d83e7b6-31d0-44f0-b914-8d2f3b578779', name: 'Rodrigo Cañas', role: 'Admin' },
  { id: 'f67c6cec-4af7-4876-aac2-bd23b974db66', name: 'Vicente Torres', role: 'Admin' },
  { id: '9f156deb-c219-4b51-b454-5a4692629332', name: 'Comercial', role: 'Ejecutiva' },
  { id: '6608503b-3cc7-447a-9ffd-f8f94795cd50', name: 'Karina Valenzuela', role: 'Ejecutiva' },
];

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
  const [selectedUser, setSelectedUser] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'select' | 'code'>('select');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const isSmallScreen = useIsSmallScreen();

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!selectedUser) { toast.error('Selecciona tu usuario'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/otp-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error enviando codigo');
      setStep('code');
      setCountdown(300);
      toast.success('Codigo enviado. Revisa tu correo.');
      setTimeout(() => codeRef.current?.focus(), 200);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) { toast.error('Ingresa el codigo de 6 digitos'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/otp-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId: selectedUser }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Codigo invalido');
      const session = { token: data.token, user: data.user, exp: Date.now() + 48 * 60 * 60 * 1000 };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/otp-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error reenviando');
      setCountdown(300);
      setCode('');
      toast.success('Nuevo codigo enviado');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const selectedUserObj = CRM_USERS.find(u => u.id === selectedUser);

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

          {step === 'select' ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-black text-white">Bienvenido de vuelta</h1>
                <p className="mt-1.5 text-sm text-slate-400">Selecciona tu usuario y te enviaremos un codigo de acceso</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quien eres?</label>
                  <div className="space-y-2">
                    {CRM_USERS.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUser(u.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition cursor-pointer text-left ${
                          selectedUser === u.id
                            ? 'border-[#2DB89E]/60 bg-[#2DB89E]/10'
                            : 'border-white/8 bg-white/4 hover:border-white/20 hover:bg-white/6'
                        }`}
                      >
                        <div className={`flex items-center justify-center h-9 w-9 rounded-full text-sm font-black shrink-0 ${
                          selectedUser === u.id
                            ? 'bg-[#2DB89E] text-white'
                            : 'bg-white/10 text-slate-400'
                        }`}>
                          {u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate ${selectedUser === u.id ? 'text-white' : 'text-slate-300'}`}>{u.name}</p>
                          <p className="text-xs text-slate-500">{u.role}</p>
                        </div>
                        {selectedUser === u.id && (
                          <svg className="ml-auto h-5 w-5 text-[#2DB89E] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleSendCode}
                  disabled={loading || !selectedUser}
                  className="mt-2 w-full h-12 rounded-xl text-base font-black text-white shadow-[0_0_24px_rgba(45,184,158,0.3)] transition hover:shadow-[0_0_36px_rgba(45,184,158,0.45)] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #2DB89E 0%, #1B9E85 100%)' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      Enviando...
                    </span>
                  ) : 'Enviar codigo de acceso'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-black text-white">Ingresa el codigo</h1>
                <p className="mt-1.5 text-sm text-slate-400">
                  Enviamos un codigo de 6 digitos al correo de <span className="text-white font-semibold">{selectedUserObj?.name}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Codigo</label>
                  <Input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoComplete="one-time-code"
                    className="h-14 rounded-xl border-white/8 bg-white/4 text-white text-center text-2xl font-mono font-black tracking-[0.5em] placeholder:text-slate-700 focus:border-[#2DB89E]/50 focus:ring-[#2DB89E]/20 transition"
                    style={{ WebkitTextFillColor: 'white', WebkitBoxShadow: '0 0 0 1000px #0c1a35 inset' }}
                    maxLength={6}
                    required
                  />
                </div>

                {countdown > 0 && (
                  <p className="text-center text-xs text-slate-500">
                    Expira en <span className="font-bold text-[#2DB89E]">{formatTime(countdown)}</span>
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="mt-2 w-full h-12 rounded-xl text-base font-black text-white shadow-[0_0_24px_rgba(45,184,158,0.3)] transition hover:shadow-[0_0_36px_rgba(45,184,158,0.45)] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #2DB89E 0%, #1B9E85 100%)' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      Verificando...
                    </span>
                  ) : 'Iniciar sesion'}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => { setStep('select'); setCode(''); setCountdown(0); }}
                  className="text-sm text-slate-500 hover:text-slate-300 transition"
                >
                  Cambiar usuario
                </button>
                {countdown <= 0 && (
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="text-sm font-semibold text-[#2DB89E] hover:text-[#3ACFB8] transition disabled:opacity-50"
                  >
                    Reenviar codigo
                  </button>
                )}
              </div>
            </>
          )}

          <p className="mt-8 text-center text-xs text-slate-600">
            Necesitas acceso?{' '}
            <a href="https://wa.me/56994366697" target="_blank" rel="noopener noreferrer" className="text-[#2DB89E] font-semibold hover:text-[#3ACFB8] transition">
              Contactanos
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
