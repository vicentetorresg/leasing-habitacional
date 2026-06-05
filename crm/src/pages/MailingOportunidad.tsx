import { useState, useRef, useEffect } from 'react';

const AUTH_USER = 'vtorres';
const AUTH_PASS = 'vtorres';
const SESSION_KEY = 'mailing_oportunidad_auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const INPUT_STYLE: React.CSSProperties = {
  color: 'white',
  WebkitTextFillColor: 'white',
  WebkitBoxShadow: '0 0 0 1000px #0e0e1a inset',
  caretColor: '#f97316',
};

// All possible statuses in the system
const ALL_STATUSES = [
  { key: 'new',                    label: 'Nuevo',               group: 'Ejecutiva' },
  { key: 'calling',                label: 'Llamando',            group: 'Ejecutiva' },
  { key: 'first_call',             label: '1er contacto',        group: 'Ejecutiva' },
  { key: 'second_call',            label: '2do contacto',        group: 'Ejecutiva' },
  { key: 'scheduled',              label: 'Agendado',            group: 'Ejecutiva' },
  { key: 'asesoria_agendada',      label: 'Asesoría Agendada',   group: 'Asesor' },
  { key: 'recontactar',            label: 'Recontactar',         group: 'Asesor' },
  { key: 'asesoria_concretada',    label: 'Asesoría Concretada', group: 'Asesor' },
  { key: 'plan_presentado',        label: 'Plan Presentado',     group: 'Asesor' },
  { key: 'departamento_reservado', label: 'Depto Reservado',     group: 'Asesor' },
  { key: 'departamento_cerrado',   label: 'Depto Cerrado',       group: 'Asesor' },
  { key: 'cierres',                label: 'Cierres',             group: 'Asesor' },
  { key: 'disqualified',           label: 'No califica',         group: 'Otros' },
  { key: 'bad_number',             label: 'Número malo',         group: 'Otros' },
  { key: 'no_califica',            label: 'No califica (v2)',    group: 'Otros' },
];

const GROUPS = ['Ejecutiva', 'Asesor', 'Otros'];

// ─── Toolbar button ───────────────────────────────────────────────────────────
function ToolBtn({ title, onClick, children }: {
  title: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition text-sm font-semibold select-none"
    >
      {children}
    </button>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === AUTH_USER && pass === AUTH_PASS) {
      sessionStorage.setItem(SESSION_KEY, '1');
      onLogin();
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080810]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[100px]" />

      <div className="relative w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.5)] mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white">Mailing Oportunidad</h1>
          <p className="mt-1 text-sm text-slate-400">Envía campañas a toda la base</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Usuario</label>
            <input
              type="text"
              value={user}
              onChange={e => setUser(e.target.value)}
              autoComplete="off"
              style={INPUT_STYLE}
              className="w-full h-11 rounded-xl border border-white/8 bg-white/4 px-4 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 transition"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              style={INPUT_STYLE}
              className="w-full h-11 rounded-xl border border-white/8 bg-white/4 px-4 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 transition"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400 font-medium">{error}</p>}
          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-orange-500 text-sm font-black text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:bg-orange-400 transition"
          >
            Acceder
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type StatusCount = { status: string; total: number; with_email: number };

export default function MailingOportunidad() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [subject, setSubject] = useState('');
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [testEmails, setTestEmails] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number; test?: boolean } | null>(null);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authed) return;
    setLoadingCounts(true);
    fetch(`${SUPABASE_URL}/functions/v1/send-mailing-oportunidad`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ count_only: true }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.counts) {
          setStatusCounts(data.counts);
          // Pre-select all statuses that have leads with email
          const withEmail = data.counts
            .filter((c: StatusCount) => c.with_email > 0)
            .map((c: StatusCount) => c.status);
          setSelected(new Set(withEmail));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCounts(false));
  }, [authed]);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const buildEmailHtml = (bodyHtml: string) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Proppi</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF0FB;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EEF0FB;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4A5CB8 0%,#6B7DD6 55%,#8198E7 100%);border-radius:16px 16px 0 0;padding:36px 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Logo row -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <!-- P arch icon -->
                          <div style="background:rgba(255,255,255,0.18);border-radius:10px;padding:9px 10px;display:inline-block;line-height:0;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 4h7a5 5 0 0 1 0 10H6V4z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                              <line x1="6" y1="14" x2="6" y2="20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                            </svg>
                          </div>
                        </td>
                        <td style="padding-left:10px;vertical-align:middle;">
                          <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">PROPPI</span>
                        </td>
                      </tr>
                    </table>
                    <!-- Tagline -->
                    <p style="margin:14px 0 0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:0.3px;">Tu asesor inmobiliario de confianza</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="background:linear-gradient(90deg,#4A5CB8,#8198E7,#B7C5F2);height:3px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;">
              <div style="color:#1e293b;font-size:15px;line-height:1.8;">
                ${bodyHtml}
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="background:#ffffff;padding:0 40px;">
              <div style="border-top:1px solid #E8ECFB;"></div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#ffffff;padding:24px 40px 36px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="https://proppi.cl" style="display:inline-block;background:linear-gradient(135deg,#4A5CB8,#7B8EDF);color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:11px 26px;border-radius:8px;letter-spacing:0.3px;">
                      Visitar proppi.cl &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1B2259;border-radius:0 0 16px 16px;padding:26px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:14px;font-weight:900;color:#8198E7;letter-spacing:1.5px;text-transform:uppercase;">PROPPI</p>
                    <p style="margin:0 0 14px;font-size:11px;color:#6B7DD6;">proppi.cl</p>
                    <p style="margin:0;font-size:11px;color:#4A5580;line-height:1.7;">
                      Recibiste este mensaje porque registraste tu inter&eacute;s en uno de nuestros proyectos.<br/>
                      Consultas: <a href="mailto:contacto@proppi.cl" style="color:#8198E7;text-decoration:none;">contacto@proppi.cl</a>
                    </p>
                  </td>
                  <td align="right" valign="top" style="padding-left:16px;">
                    <div style="background:rgba(129,152,231,0.15);border-radius:10px;padding:10px;display:inline-block;line-height:0;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 4h7a5 5 0 0 1 0 10H6V4z" stroke="#8198E7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <line x1="6" y1="14" x2="6" y2="20" stroke="#8198E7" stroke-width="2.5" stroke-linecap="round"/>
                      </svg>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:18px;border-top:1px solid rgba(255,255,255,0.06);margin-top:18px;">
                    <p style="margin:0;font-size:10px;color:#2D3866;">&copy; ${new Date().getFullYear()} Proppi &middot; Todos los derechos reservados</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value ?? undefined);
    editorRef.current?.focus();
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => exec('insertImage', ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleInsertImageUrl = () => {
    const url = window.prompt('URL de la imagen:');
    if (url) exec('insertImage', url);
  };

  const toggleStatus = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectGroup = (group: string, value: boolean) => {
    const keys = ALL_STATUSES
      .filter(s => s.group === group)
      .map(s => s.key);
    setSelected(prev => {
      const next = new Set(prev);
      keys.forEach(k => value ? next.add(k) : next.delete(k));
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(ALL_STATUSES.map(s => s.key)));
  const selectNone = () => setSelected(new Set());

  // Count emails that will receive the campaign
  const totalEmailsSelected = statusCounts
    .filter(c => selected.has(c.status))
    .reduce((sum, c) => sum + c.with_email, 0);

  const getCount = (key: string): StatusCount | undefined =>
    statusCounts.find(c => c.status === key);

  // ── Test send ─────────────────────────────────────────────────────────────
  const handleTestSend = async () => {
    if (!subject.trim()) { setError('Escribe un asunto antes de enviar.'); return; }
    const html = editorRef.current?.innerHTML?.trim() ?? '';
    if (!html || html === '<br>') { setError('El cuerpo del email está vacío.'); return; }
    const emails = testEmails.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) { setError('Ingresa al menos una dirección de prueba.'); return; }

    setError('');
    setSendingTest(true);
    setResult(null);

    try {
      const wrappedHtml = buildEmailHtml(html);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-mailing-oportunidad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({ subject, html: wrappedHtml, test_emails: emails }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({ sent: data.sent, total: data.total, test: true });
      } else {
        setError(data.error || 'Error al enviar prueba.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingTest(false);
    }
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!subject.trim()) { setError('Escribe un asunto antes de enviar.'); return; }
    const html = editorRef.current?.innerHTML?.trim() ?? '';
    if (!html || html === '<br>') { setError('El cuerpo del email está vacío.'); return; }
    if (selected.size === 0) { setError('Selecciona al menos una etapa.'); return; }
    if (totalEmailsSelected === 0) { setError('Los contactos seleccionados no tienen email registrado.'); return; }

    const confirmed = window.confirm(
      `¿Confirmas enviar a ${totalEmailsSelected} contacto${totalEmailsSelected !== 1 ? 's' : ''}?\n\nAsunto: ${subject}`
    );
    if (!confirmed) return;

    setError('');
    setSending(true);
    setResult(null);

    try {
      const wrappedHtml = buildEmailHtml(html);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-mailing-oportunidad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({
          subject,
          html: wrappedHtml,
          statuses: Array.from(selected),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({ sent: data.sent, total: data.total });
        if (editorRef.current) editorRef.current.innerHTML = '';
        setSubject('');
      } else {
        setError(data.error || 'Error desconocido al enviar.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Header */}
      <header className="relative border-b border-white/5 bg-[#080810]/80 backdrop-blur px-8 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.4)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-black text-white leading-none">Mailing Oportunidad</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">LeadFlash · Proppi</p>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-6 py-8 space-y-6">

        {/* Success */}
        {result && (
          <div className="rounded-xl border border-green-400/20 bg-green-400/8 px-5 py-4 flex items-start gap-3">
            <svg className="mt-0.5 shrink-0 text-green-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div>
              <p className="text-sm font-bold text-green-300">
                {result.test ? 'Prueba enviada' : 'Campaña enviada'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {result.test
                  ? <><strong className="text-white">{result.sent}</strong> email{result.sent !== 1 ? 's' : ''} de prueba enviado{result.sent !== 1 ? 's' : ''} correctamente.</>
                  : <><strong className="text-white">{result.sent}</strong> emails enviados de <strong className="text-white">{result.total}</strong> leads seleccionados.</>
                }
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_280px] gap-6 items-start">
          {/* Left: composer */}
          <div className="space-y-5">
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Asunto</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ej: Oportunidad única — departamentos desde UF 2.000"
                style={INPUT_STYLE}
                className="w-full h-11 rounded-xl border border-white/8 bg-white/4 px-4 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 transition"
              />
            </div>

            {/* Editor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cuerpo del email</label>
              <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/6 flex-wrap">
                  <ToolBtn title="Negrita" onClick={() => exec('bold')}><strong>B</strong></ToolBtn>
                  <ToolBtn title="Cursiva" onClick={() => exec('italic')}><em>I</em></ToolBtn>
                  <ToolBtn title="Subrayado" onClick={() => exec('underline')}><span style={{ textDecoration: 'underline' }}>U</span></ToolBtn>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <ToolBtn title="Título H2" onClick={() => exec('formatBlock', 'h2')}>H2</ToolBtn>
                  <ToolBtn title="Párrafo" onClick={() => exec('formatBlock', 'p')}>P</ToolBtn>
                  <ToolBtn title="Lista" onClick={() => exec('insertUnorderedList')}>&#8226; Lista</ToolBtn>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <ToolBtn title="Alinear izquierda" onClick={() => exec('justifyLeft')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
                  </ToolBtn>
                  <ToolBtn title="Centrar" onClick={() => exec('justifyCenter')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                  </ToolBtn>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <ToolBtn title="Subir imagen" onClick={() => fileInputRef.current?.click()}>
                    <span className="flex items-center gap-1 text-xs">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Imagen
                    </span>
                  </ToolBtn>
                  <ToolBtn title="Imagen por URL" onClick={handleInsertImageUrl}>
                    <span className="flex items-center gap-1 text-xs">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      URL
                    </span>
                  </ToolBtn>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <ToolBtn title="Limpiar formato" onClick={() => exec('removeFormat')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
                  </ToolBtn>
                </div>

                {/* Editable */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') { e.preventDefault(); exec('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;'); }
                  }}
                  className="min-h-[300px] p-5 text-slate-100 focus:outline-none text-sm leading-relaxed"
                  style={{ caretColor: '#f97316' }}
                  data-placeholder="Escribe el contenido del email... Usa {{nombre}} para personalizar con el nombre del lead."
                />
              </div>
              <p className="text-[11px] text-slate-600">
                Usa <code className="text-orange-400/80">{'{{nombre}}'}</code> para insertar el primer nombre de cada destinatario.
              </p>
            </div>

            {/* Error */}
            {error && <p className="text-sm text-red-400 font-medium">{error}</p>}

            {/* Send */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-slate-500">
                {loadingCounts
                  ? 'Calculando destinatarios...'
                  : `${totalEmailsSelected} contacto${totalEmailsSelected !== 1 ? 's' : ''} recibirán este email`}
              </p>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || totalEmailsSelected === 0}
                className="flex items-center gap-2 px-6 h-11 rounded-xl bg-orange-500 text-sm font-black text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:bg-orange-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Enviar campaña
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: status filters */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Etapas destinatarias</h3>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold transition">Todos</button>
                <span className="text-slate-700">·</span>
                <button onClick={selectNone} className="text-[11px] text-slate-500 hover:text-slate-300 font-semibold transition">Ninguno</button>
              </div>
            </div>

            {loadingCounts ? (
              <p className="text-xs text-slate-500 py-4 text-center">Cargando...</p>
            ) : (
              <div className="space-y-4">
                {GROUPS.map(group => {
                  const groupStatuses = ALL_STATUSES.filter(s => s.group === group);
                  const groupHasData = groupStatuses.some(s => getCount(s.key));
                  if (!groupHasData) return null;

                  const allGroupSelected = groupStatuses.every(s => selected.has(s.key));

                  return (
                    <div key={group}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{group}</span>
                        <button
                          onClick={() => selectGroup(group, !allGroupSelected)}
                          className="text-[10px] text-slate-600 hover:text-slate-400 transition font-medium"
                        >
                          {allGroupSelected ? 'Desmarcar' : 'Marcar todos'}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {groupStatuses.map(s => {
                          const cnt = getCount(s.key);
                          if (!cnt) return null;
                          const isSelected = selected.has(s.key);
                          return (
                            <label
                              key={s.key}
                              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer transition ${
                                isSelected ? 'bg-orange-500/10' : 'hover:bg-white/4'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStatus(s.key)}
                                className="accent-orange-500 w-3.5 h-3.5 rounded shrink-0"
                              />
                              <span className={`text-xs flex-1 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                {s.label}
                              </span>
                              <span className={`text-[10px] font-mono tabular-nums ${cnt.with_email > 0 ? 'text-orange-400' : 'text-slate-700'}`}>
                                {cnt.with_email}/{cnt.total}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total */}
            <div className="pt-2 border-t border-white/6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Emails a enviar</span>
                <span className="text-sm font-black text-orange-400">{totalEmailsSelected}</span>
              </div>
            </div>

            {/* Test send */}
            <div className="pt-2 border-t border-white/6 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Envío de prueba</p>
              <textarea
                value={testEmails}
                onChange={e => setTestEmails(e.target.value)}
                placeholder={"correo1@ejemplo.com,\ncorreo2@ejemplo.com"}
                rows={3}
                style={{ ...INPUT_STYLE, WebkitBoxShadow: '0 0 0 1000px #0e0e1a inset', resize: 'none' }}
                className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs placeholder:text-slate-700 focus:outline-none focus:border-orange-500/40 transition"
              />
              <button
                type="button"
                onClick={handleTestSend}
                disabled={sendingTest || !testEmails.trim()}
                className="w-full flex items-center justify-center gap-2 h-8 rounded-lg border border-orange-500/30 text-xs font-bold text-orange-400 hover:bg-orange-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sendingTest ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    Enviando...
                  </>
                ) : 'Enviar prueba'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #475569;
          pointer-events: none;
        }
        [contenteditable] img { max-width:100%; height:auto; border-radius:6px; margin:8px 0; }
        [contenteditable] h2 { font-size:1.2rem; font-weight:700; margin:10px 0 4px; color:#f1f5f9; }
        [contenteditable] ul { padding-left:1.5rem; margin:6px 0; }
        [contenteditable] a { color:#fb923c; text-decoration:underline; }
      `}</style>
    </div>
  );
}
