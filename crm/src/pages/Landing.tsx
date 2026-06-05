import { useNavigate } from "react-router-dom";
import proppiLogo from "@/assets/proppi-logo.png";

const WHATSAPP_URL = "https://wa.me/56994366697?text=Hola%2C%20me%20interesa%20LeadFlash";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080810] text-slate-100 overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#080810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.6)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L4.09 12.26a1 1 0 0 0 .79 1.62h7.23l-1.1 7.91L20.1 11.7a1 1 0 0 0-.74-1.62h-7.07L13 2z" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              Lead<span className="text-orange-500">Flash</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/demo")}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              Demo
            </button>
            <button
              onClick={() => navigate("/login")}
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition hover:bg-orange-400 hover:shadow-[0_0_28px_rgba(249,115,22,0.5)]"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen items-center pt-20">
        {/* Grid background */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
        {/* Glow blobs */}
        <div className="pointer-events-none absolute left-0 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-[400px] w-[400px] translate-x-1/3 rounded-full bg-sky-500/8 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-orange-500/5 blur-[80px]" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-24 md:grid-cols-2 md:px-10 md:py-32">
          {/* Left */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/8 px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-orange-300">
                CRM para leads inmobiliarios en Chile
              </span>
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white md:text-7xl">
                Responde en{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                    minutos.
                  </span>
                  <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 opacity-60" />
                </span>
                <br />
                Cierra más{" "}
                <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                  departamentos.
                </span>
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-slate-400">
                LeadFlash conecta Meta Ads con tu equipo comercial en tiempo real. Priorización inteligente, alertas
                instantáneas y seguimiento guiado para que cada lead tenga una acción clara.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-4 text-base font-black text-white shadow-[0_0_32px_rgba(249,115,22,0.4)] transition hover:bg-orange-400 hover:shadow-[0_0_48px_rgba(249,115,22,0.55)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
                Empezar por WhatsApp
              </a>
              <button
                onClick={() => navigate("/demo")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/4 px-8 py-4 text-base font-bold text-white backdrop-blur transition hover:border-white/20 hover:bg-white/8"
              >
                Ver demo en vivo
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard value="&lt;3s" label="Lead en pantalla" />
              <StatCard value="+30%" label="Tasa de cierre" />
              <StatCard value="24/7" label="Flujo activo" />
            </div>
          </div>

          {/* Right – Live Activity Panel */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="rounded-2xl border border-white/8 bg-white/3 p-1 shadow-2xl backdrop-blur-xl">
                {/* Panel header */}
                <div className="rounded-xl border border-white/6 bg-[#0d0d1a] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Actividad en vivo</p>
                    </div>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      LIVE
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <LiveItem
                      color="orange"
                      icon="⚡"
                      title="Nuevo lead: Juan Pérez"
                      subtitle="Facebook Lead Ads · Mirador Norte"
                      badge="Hace 2s"
                    />
                    <LiveItem
                      color="blue"
                      icon="📞"
                      title="Llamada sugerida: María González"
                      subtitle="Intento #2 · Alta prioridad"
                      badge="Ahora"
                    />
                    <LiveItem
                      color="purple"
                      icon="📅"
                      title="Asesoría agendada: Camila Soto"
                      subtitle="Hoy 18:30 · Asesor: Rodrigo"
                      badge="Confirmada"
                    />
                    <LiveItem
                      color="emerald"
                      icon="✅"
                      title="Lead calificado: Nicolás Fernández"
                      subtitle="Sueldo validado + preaprobación"
                      badge="Listo"
                    />
                  </div>
                </div>
              </div>
              {/* Glow under panel */}
              <div className="mx-8 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent blur-sm" />
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="relative border-y border-white/5 py-20 px-6 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Por qué LeadFlash</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">Sin fricción. Sin pérdidas.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ValueCard
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L4.09 12.26a1 1 0 0 0 .79 1.62h7.23l-1.1 7.91L20.1 11.7a1 1 0 0 0-.74-1.62h-7.07L13 2z" />
                </svg>
              }
              title="Respuesta inmediata"
              description="Cuando un lead llega y no lo llamas, el interés cae rápido. LeadFlash lo pone frente a tu equipo en segundos."
            />
            <ValueCard
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
              title="Prioridad automática"
              description="La plataforma ordena por urgencia real: antigüedad, intentos previos y señales de intención del lead."
            />
            <ValueCard
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              }
              title="Operación sin fugas"
              description="Recordatorios, pendientes y agenda en un solo flujo para que ningún lead quede olvidado."
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative px-6 py-24 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(249,115,22,0.04),transparent)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Proceso</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Cómo funciona LeadFlash</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Implementación simple, sin fricción para tu equipo comercial.
            </p>
          </div>
          <div className="relative grid gap-6 md:grid-cols-3">
            {/* Connector line */}
            <div className="absolute left-1/2 top-10 hidden h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent md:block" />
            <StepCard
              step="01"
              title="Conectas Meta Ads"
              description="Integramos formularios de Facebook e Instagram con webhook en tiempo real."
            />
            <StepCard
              step="02"
              title="Se priorizan leads"
              description="Cada lead entra con contexto, sugerencia de acción y nivel de urgencia."
            />
            <StepCard
              step="03"
              title="Tu equipo ejecuta"
              description="Llamadas, agenda y seguimiento en una sola interfaz enfocada en cierre."
            />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="border-y border-white/5 bg-[#0a0a14] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Funcionalidades</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">Diseñado para venta inmobiliaria</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon="⚡"
              title="Alertas en tiempo real"
              description="Notificación visual y sonora cuando entra un lead nuevo."
            />
            <FeatureCard
              icon="🧠"
              title="Recomendación IA"
              description="El sistema sugiere a quién llamar primero y por qué."
            />
            <FeatureCard
              icon="📅"
              title="Agenda comercial"
              description="Agenda visitas y asesorías sin salir del flujo operativo."
            />
            <FeatureCard
              icon="🔄"
              title="Reintentos inteligentes"
              description="Leads no contactados vuelven con recordatorios automáticos."
            />
            <FeatureCard
              icon="📊"
              title="Dashboard operativo"
              description="Métricas de contacto, avance diario y conversiones por ejecutivo."
            />
            <FeatureCard
              icon="🇨🇱"
              title="Enfoque Chile"
              description="Flujo pensado para brokers, proyectos y leads del mercado local."
            />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative px-6 py-28 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_50%,rgba(249,115,22,0.08),transparent)]" />
        <div className="relative mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-[#130c04] via-[#0f0d18] to-[#080810] p-10 text-center shadow-[0_0_80px_rgba(249,115,22,0.08)] md:p-16">
            {/* Top glow line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Empieza hoy</p>
            <h2 className="text-3xl font-black text-white md:text-5xl">
              ¿Listo para responder más rápido que tu competencia?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
              Implementa LeadFlash esta semana y convierte tus campañas de Meta Ads en una operación comercial
              predecible.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-10 py-4 text-base font-black text-white shadow-[0_0_40px_rgba(249,115,22,0.4)] transition hover:bg-orange-400 hover:shadow-[0_0_56px_rgba(249,115,22,0.55)]"
              >
                Agendar implementación
              </a>
              <button
                onClick={() => navigate("/demo")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/4 px-10 py-4 text-base font-bold text-white transition hover:bg-white/8"
              >
                Ver demo en vivo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER BRAND ── */}
      <section className="border-t border-white/5 bg-[#080810] px-6 py-12 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Usado por equipos inmobiliarios
            </p>
            <p className="mt-2 text-xl font-black text-white">Operación comercial más ordenada, rápida y visible.</p>
          </div>
          <img src={proppiLogo} alt="Proppi" className="h-16 rounded-xl bg-white/95 p-3 opacity-90" />
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-6 text-center md:px-10">
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} LeadFlash — Software de gestión de leads para equipos inmobiliarios en Chile.
        </p>
      </footer>
    </div>
  );
};

/* ── Sub-components ── */

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-center backdrop-blur">
      <p className="text-2xl font-black text-orange-400 md:text-3xl" dangerouslySetInnerHTML={{ __html: value }} />
      <p className="mt-1 text-xs font-medium text-slate-400">{label}</p>
    </div>
  );
}

function LiveItem({
  icon,
  title,
  subtitle,
  badge,
  color,
}: {
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  color: "orange" | "blue" | "purple" | "emerald";
}) {
  const colors = {
    orange: "border-orange-500/20 bg-orange-500/5",
    blue: "border-sky-500/20 bg-sky-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
  };
  const badgeColors = {
    orange: "bg-orange-500/15 text-orange-300 border-orange-500/20",
    blue: "bg-sky-500/15 text-sky-300 border-sky-500/20",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/20",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3.5 ${colors[color]}`}>
      <span className="text-xl leading-none">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColors[color]}`}>
        {badge}
      </span>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-2xl border border-white/6 bg-white/2 p-6 transition hover:border-orange-500/20 hover:bg-white/4">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
        {icon}
      </div>
      <h3 className="text-base font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="relative rounded-2xl border border-white/6 bg-white/2 p-7 transition hover:border-orange-500/20">
      <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-sm font-black text-orange-400">
        {step}
      </div>
      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="group rounded-2xl border border-white/6 bg-white/2 p-6 transition hover:-translate-y-0.5 hover:border-orange-500/25 hover:bg-white/4 hover:shadow-[0_8px_32px_rgba(249,115,22,0.06)]">
      <span className="mb-4 block text-3xl">{icon}</span>
      <h3 className="mb-2 text-base font-black text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">{description}</p>
    </div>
  );
}

export default Landing;
