import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Full-screen Executive View Mockup ─────────────────────────
function MockExecutiveView() {
  return (
    <div
      className="bg-[#faf8f5] rounded-2xl border border-gray-200 shadow-2xl overflow-hidden w-full"
      style={{ fontSize: "11px" }}
    >
      {/* Top nav */}
      <div className="bg-[#faf8f5] border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚨</span>
          <span className="font-black text-orange-600 text-sm">ALERTA DE LEADS</span>
          <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-[10px] font-black">
            18 leads sin gestionar
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-accent text-accent-foreground rounded-lg text-[10px] font-black">
            ➕ Nuevo Lead
          </span>
          <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600">
            ● Activar alertas
          </span>
          {/* Missed calls bell */}
          <div className="relative">
            <span className="text-gray-500 text-sm">🔔</span>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[7px] font-black">
              2
            </span>
          </div>
          <span className="text-gray-500 text-[10px] font-bold">Asesorías</span>
          <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">
            JC
          </div>
        </div>
      </div>

      {/* Metrics bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-100 bg-white/50">
        {[
          { v: "18", label: "LEADS HOY", color: "text-gray-900" },
          { v: "5", label: "CONTESTADOS", color: "text-green-600" },
          { v: "3", label: "NO CONTESTADOS", color: "text-red-500" },
          { v: "63%", label: "TASA CONTACTO", color: "text-orange-500" },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={`text-lg font-black ${m.color}`}>{m.v}</span>
            <span className="text-[8px] text-gray-400 font-bold">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Daily goals compact */}
      <div className="flex items-center gap-4 px-4 py-1 border-b border-gray-50 bg-white/30">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[8px] text-gray-400 font-bold">📞 LLAMADOS</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: "44%" }} />
          </div>
          <span className="text-[9px] font-black text-orange-600">35/80</span>
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[8px] text-gray-400 font-bold">📅 AGENDADOS</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: "60%" }} />
          </div>
          <span className="text-[9px] font-black text-green-600">12/20</span>
        </div>
      </div>

      <div className="flex" style={{ minHeight: "320px" }}>
        {/* Left: Table + Today's calls */}
        <div className="flex-1 p-2 space-y-2 flex flex-col">
          {/* Idle timer */}
          <div className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-yellow-50 border border-yellow-200">
            <span className="text-[8px]">⏱️</span>
            <span className="text-[10px] font-mono font-bold text-yellow-600">1:24 sin llamar</span>
          </div>

          {/* Leads table */}
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden flex-1">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "NOMBRE", "TELÉFONO", "RUT", "ESTADO", "TIEMPO"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left text-[8px] text-gray-400 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { n: "Nicolás Díaz", ph: "+56950765217", rut: "16501062-0", st: "🆕 Nuevo", t: "18h", sel: true },
                  { n: "Claudio Rojas", ph: "+56980069638", rut: "15626973-9", st: "🆕 Nuevo", t: "16h", sel: false },
                  { n: "Francisca Morales", ph: "+56924024567", rut: "17801891-1", st: "1️⃣ 1er Llamado", t: "2d", sel: false },
                  { n: "Carolina Silva", ph: "+56912345678", rut: "18234567-8", st: "2️⃣ 2do Llamado", t: "1d", sel: false },
                  { n: "Andrea López", ph: "+56987654321", rut: "19876543-2", st: "🆕 Nuevo", t: "4h", sel: false },
                ].map((r, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${r.sel ? "bg-orange-50" : "hover:bg-gray-50"}`}>
                    <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="px-2 py-1.5 font-bold text-gray-900">{r.n}</td>
                    <td className="px-2 py-1.5 font-mono text-orange-500">{r.ph}</td>
                    <td className="px-2 py-1.5 text-gray-500">{r.rut}</td>
                    <td className="px-2 py-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 text-[8px] font-bold">{r.st}</span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-400 font-mono">{r.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Today's calls */}
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-2 py-1.5 text-[9px] font-bold text-gray-500 border-b border-gray-50">
              📊 Llamadas de Hoy (8)
            </div>
            <table className="w-full text-[9px]">
              <tbody>
                {[
                  { n: "José Fernández", st: "✅ Agendado", t: "10:15" },
                  { n: "Pedro Muñoz", st: "🚫 No Califica", t: "10:02" },
                  { n: "María González", st: "1️⃣ 1er Llamado", t: "09:48" },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-2 py-1 font-bold text-gray-700">{r.n}</td>
                    <td className="px-2 py-1">
                      <span className="text-[8px] font-bold">{r.st}</span>
                    </td>
                    <td className="px-2 py-1 text-gray-400 font-mono text-right">{r.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Lead Detail Panel */}
        <div className="w-52 border-l border-gray-200 bg-white/50 p-2 space-y-2">
          {/* Lead card */}
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[8px] font-black">🆕 Nuevo</span>
              <span className="text-orange-400 font-mono text-[9px] font-bold">18h 12m</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">🧑</span>
              <div>
                <h3 className="text-[11px] font-black text-gray-900">Nicolás Díaz</h3>
                <p className="text-orange-500 font-bold text-[9px]">+56950765217</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {[
                { l: "RUT", v: "16501062-0" },
                { l: "RENTA", v: "$1.75MM" },
                { l: "DICOM", v: "✅ No" },
                { l: "FUENTE", v: "demo" },
              ].map((f, i) => (
                <div key={i}>
                  <span className="text-[7px] text-gray-400 font-bold block">{f.l}</span>
                  <span className="font-bold text-gray-800 text-[9px]">{f.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg border border-gray-100 p-1.5">
            <div className="text-[8px] text-gray-400 px-1">📝 Notas...</div>
          </div>

          {/* Call button */}
          <button className="w-full py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-[10px] rounded-lg shadow-md">
            🚨 LLAMAR AHORA
          </button>

          {/* Status buttons */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: "📅 Agendado", bg: "bg-green-50 border-green-200 text-green-700" },
              { label: "🚫 No Califica", bg: "bg-gray-50 border-gray-200 text-gray-600" },
              { label: "1️⃣ 1er Llamado", bg: "bg-yellow-50 border-yellow-200 text-yellow-700" },
              { label: "2️⃣ 2do Llamado", bg: "bg-orange-50 border-orange-200 text-orange-700" },
              { label: "❌ Nro Malo", bg: "bg-red-50 border-red-200 text-red-600" },
            ].map((b, i) => (
              <div
                key={i}
                className={`py-1 rounded border text-center text-[7px] font-bold ${b.bg}`}
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full-screen Advisor Kanban with animated drag ──────────────
function MockAdvisorKanban() {
  const [dragPhase, setDragPhase] = useState(0);

  useEffect(() => {
    // Animate: 0=initial, 1=card lifted, 2=card moving, 3=card dropped
    const timers = [
      setTimeout(() => setDragPhase(1), 800),
      setTimeout(() => setDragPhase(2), 1500),
      setTimeout(() => setDragPhase(3), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const movingCard = { name: "Nicolás Díaz", rut: "16501062-0", src: "📘 FB", salary: "1.75MM", prio: "🟢", days: 0 };

  const columns = [
    {
      title: "📅 Agendada",
      color: "border-blue-300 bg-blue-50/80",
      count: dragPhase < 3 ? 2 : 1,
      cards: [
        ...(dragPhase < 1 ? [movingCard] : []),
        { name: "Carolina Pérez", rut: "18234567-8", src: "📸 IG", salary: "2.1MM", prio: "🟢", days: 1 },
      ],
    },
    {
      title: "🔄 Recontactar",
      color: "border-yellow-300 bg-yellow-50/80",
      count: 1,
      cards: [{ name: "Francisca Morales", rut: "17801891-1", src: "📘 FB", salary: "1.89MM", prio: "🔴", days: 5 }],
    },
    {
      title: "✅ Concretada",
      color: "border-green-300 bg-green-50/80",
      count: dragPhase >= 3 ? 2 : 1,
      cards: [
        { name: "Claudio Rojas", rut: "15626973-9", src: "📋 Manual", salary: "1.38MM", prio: "🟢", days: 0 },
        ...(dragPhase >= 3 ? [movingCard] : []),
      ],
    },
    {
      title: "📋 Plan Presentado",
      color: "border-purple-300 bg-purple-50/80",
      count: 0,
      cards: [],
    },
    {
      title: "🏠 Reservado",
      color: "border-orange-300 bg-orange-50/80",
      count: 0,
      cards: [],
    },
    {
      title: "🎉 Cierres",
      color: "border-emerald-300 bg-emerald-50/80",
      count: 0,
      cards: [],
    },
  ];

  return (
    <div
      className="bg-[#faf8f5] rounded-2xl border border-gray-200 shadow-2xl overflow-hidden w-full relative"
      style={{ fontSize: "11px" }}
    >
      {/* Nav */}
      <div className="bg-[#faf8f5] border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="font-black text-orange-600 text-sm">LeadFlash</span>
          <span className="text-gray-400 text-[10px] font-bold ml-2">Telemarketing</span>
          <span className="text-orange-600 text-[10px] font-black border-b-2 border-orange-500 pb-0.5 ml-1">
            Asesorías
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[10px] font-bold">Asesor: Juan Contreras</span>
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">
            JC
          </div>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-2 p-3 min-h-[300px]">
        {columns.map((col, i) => (
          <div
            key={i}
            className={`flex-1 rounded-xl border-2 ${col.color} p-2 transition-all ${dragPhase >= 1 && dragPhase < 3 && i === 2 ? "ring-2 ring-green-400 ring-offset-1" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-black text-[10px] text-gray-700">{col.title}</h4>
              <span className="text-[9px] font-bold text-gray-400 bg-white rounded-full px-1.5">{col.count}</span>
            </div>
            {col.cards.map((card, j) => (
              <div key={j} className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 mb-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-[10px] text-gray-900">{card.name}</span>
                  <span className="text-[10px]">{card.prio}</span>
                </div>
                <div className="flex items-center gap-2 text-[8px] text-gray-500">
                  <span>🪪 {card.rut}</span>
                  <span>📣 {card.src}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[8px] text-gray-400 font-bold">💰 {card.salary}</span>
                  <span
                    className={`text-[8px] font-bold ${card.days >= 3 ? "text-yellow-600" : card.days >= 7 ? "text-red-500" : "text-gray-400"}`}
                  >
                    {card.days === 0 ? "Hoy" : `${card.days}d`}
                  </span>
                </div>
              </div>
            ))}
            {col.cards.length === 0 && <p className="text-[9px] text-gray-400 text-center py-6">Sin leads</p>}
          </div>
        ))}
      </div>

      {/* Floating card during drag animation */}
      {(dragPhase === 1 || dragPhase === 2) && (
        <motion.div
          className="absolute bg-white rounded-lg p-2 shadow-xl border-2 border-orange-300 z-20"
          style={{ width: "14%" }}
          animate={{
            left: dragPhase === 2 ? "38%" : "5%",
            top: dragPhase === 2 ? "28%" : "30%",
            rotate: dragPhase === 2 ? 1 : -2,
            scale: 1.05,
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-bold text-[10px] text-gray-900">{movingCard.name}</span>
            <span className="text-[10px]">{movingCard.prio}</span>
          </div>
          <div className="text-[8px] text-gray-500">🪪 {movingCard.rut}</div>
          <div className="text-[8px] text-gray-400 font-bold mt-0.5">💰 {movingCard.salary}</div>
        </motion.div>
      )}

      {/* Drag indicator label */}
      {dragPhase >= 1 && dragPhase < 3 && (
        <motion.div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gray-900 text-white rounded-full text-[10px] font-bold shadow-lg z-30"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🖱️ Arrastrando a "Concretada"...
        </motion.div>
      )}
      {dragPhase >= 3 && (
        <motion.div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-green-600 text-white rounded-full text-[10px] font-bold shadow-lg z-30"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          ✅ Nicolás Díaz movido a Concretada
        </motion.div>
      )}
    </div>
  );
}

// ── Simpler mock components ─────────────────────────────────────
function MockCallDialog() {
  return (
    <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-2xl p-8 max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <span className="text-5xl">📞</span>
        <h3 className="text-2xl font-black text-gray-900">Llamando a Nicolás Díaz</h3>
        <p className="text-orange-500 font-bold text-lg">+56950765217</p>
      </div>
      <div className="text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-50 rounded-xl border border-green-200">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-700 font-black text-lg">🔗 Conectado — 01:24</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-400 text-xs font-bold block">RUT</span>
            <span className="font-bold">16501062-0</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-400 text-xs font-bold block">RENTA</span>
            <span className="font-bold">$1.75MM</span>
          </div>
        </div>
        <textarea
          className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm"
          rows={2}
          defaultValue="Cliente interesado en depto 2D+2B en proyecto Las Condes. Agendar asesoría para el viernes."
          readOnly
        />
      </div>
      <button className="w-full py-4 bg-red-500 text-white font-black text-lg rounded-xl">📵 Finalizar Llamada</button>
    </div>
  );
}

function MockAlertBanner() {
  return (
    <div className="space-y-4">
      <div className="bg-red-500 text-white px-6 py-4 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-pulse">🚨</span>
          <span className="font-black text-xl">ALERTA: 5 min sin llamar</span>
        </div>
        <span className="text-red-200 font-mono text-lg font-bold">05:00</span>
      </div>
      <div className="bg-white rounded-2xl border-2 border-red-200 shadow-xl p-6 space-y-4">
        <h3 className="text-xl font-black text-red-600">⚡ ¡Llamada Urgente!</h3>
        <div className="flex items-center gap-4">
          <span className="text-4xl">🧑</span>
          <div>
            <p className="font-black text-lg text-gray-900">Claudio Rojas</p>
            <p className="text-orange-500 font-bold">+56980069638</p>
            <p className="text-sm text-gray-500">RUT: 15626973-9 · Renta: $1.38MM</p>
          </div>
        </div>
        <button className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-xl rounded-xl shadow-lg">
          📞 LLAMAR AHORA
        </button>
      </div>
    </div>
  );
}

function MockDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            v: "47",
            label: "LLAMADOS HOY",
            color: "text-orange-600",
            border: "border-orange-100",
            pct: 59,
            goal: 80,
            barColor: "bg-orange-500",
          },
          {
            v: "12",
            label: "AGENDADOS",
            color: "text-green-600",
            border: "border-green-100",
            pct: 60,
            goal: 20,
            barColor: "bg-green-500",
          },
          {
            v: "68%",
            label: "TASA CONTACTO",
            color: "text-blue-600",
            border: "border-blue-100",
            pct: 68,
            goal: 0,
            barColor: "bg-blue-500",
          },
        ].map((m, i) => (
          <div key={i} className={`bg-white rounded-xl border ${m.border} p-5 text-center shadow-sm`}>
            <p className={`text-4xl font-black ${m.color}`}>{m.v}</p>
            <p className="text-xs text-gray-500 font-bold mt-1">{m.label}</p>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className={`h-full ${m.barColor} rounded-full`} style={{ width: `${m.pct}%` }} />
            </div>
            {m.goal > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {m.pct}% de meta ({m.goal})
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h4 className="font-black text-sm text-gray-700 mb-3">📊 Rendimiento Semanal</h4>
        <div className="flex items-end gap-3 h-32">
          {[35, 42, 55, 47, 60, 38, 47].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-gradient-to-t from-orange-500 to-orange-300 rounded-t-md"
                style={{ height: `${(v / 60) * 100}%` }}
              />
              <span className="text-[10px] text-gray-400 font-bold">{["L", "M", "X", "J", "V", "S", "D"][i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Slides ─────────────────────────────────────────────────────
interface Slide {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
  content: React.ReactNode;
  bg: string;
  wide?: boolean;
}

const slides: Slide[] = [
  {
    id: 0,
    title: "LeadFlash",
    subtitle: "",
    emoji: "⚡",
    bg: "from-orange-600 via-red-500 to-orange-700",
    content: (
      <div className="text-center space-y-6">
        <p className="text-8xl">⚡</p>
        <h1 className="text-6xl font-black text-white tracking-tight">LeadFlash</h1>
        <p className="text-xl text-orange-100 font-bold max-w-md mx-auto leading-relaxed">
          CRM a medida para corretaje inmobiliario.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          {["Twilio", "Realtime", "Kanban", "Alertas"].map((tag) => (
            <span key={tag} className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white font-bold text-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 1,
    title: "Vista Ejecutiva",
    subtitle: "Panel completo de telemarketing: leads, datos, llamadas y estados.",
    emoji: "👩‍💼",
    bg: "from-orange-50 to-gray-50",
    wide: true,
    content: <MockExecutiveView />,
  },
  {
    id: 2,
    title: "Alertas de inactividad",
    subtitle: "Si no llamas, el sistema te avisa. Con alarma incluida 🚨",
    emoji: "🚨",
    bg: "from-red-50 to-orange-50",
    content: <MockAlertBanner />,
  },
  {
    id: 3,
    title: "Llamadas con Twilio",
    subtitle: "Un clic y estás hablando con el lead. Sin salir del CRM.",
    emoji: "📞",
    bg: "from-green-50 to-white",
    content: <MockCallDialog />,
  },
  {
    id: 4,
    title: "Pipeline de Asesores",
    subtitle: "Kanban visual con arrastre de cards entre estados.",
    emoji: "🗂️",
    bg: "from-blue-50 to-gray-50",
    wide: true,
    content: <MockAdvisorKanban />,
  },
  {
    id: 5,
    title: "Dashboard en tiempo real",
    subtitle: "Métricas diarias de llamados, agendamientos y tasa de contacto.",
    emoji: "📊",
    bg: "from-purple-50 to-white",
    content: <MockDashboard />,
  },
  {
    id: 6,
    title: "Hecho con IA",
    subtitle: "",
    emoji: "🚀",
    bg: "from-orange-600 via-red-500 to-orange-700",
    content: (
      <div className="text-center space-y-8">
        <p className="text-8xl">🚀</p>
        <h2 className="text-5xl font-black text-white tracking-tight">No pierdas más leads.</h2>
        <p className="text-xl text-orange-100 font-bold max-w-lg mx-auto leading-relaxed">
          Dejamos de perder leads.
          <br />
          Hoy cada lead se gestiona en menos de 3 minutos.
        </p>
        <div className="pt-6">
          <span className="px-8 py-4 bg-white text-orange-600 font-black text-xl rounded-2xl shadow-xl inline-block">
            leadflash.cl
          </span>
        </div>
      </div>
    ),
  },
];

const SLIDE_DURATION = 5500;

export default function Demo() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const goNext = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const goPrev = () => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      goNext();
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const slide = slides[currentSlide];
  const isHeroSlide = currentSlide === 0 || currentSlide === slides.length - 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
    setTouchStart(null);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col overflow-hidden relative cursor-pointer select-none"
      onClick={() => setIsPlaying((p) => !p)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate("/");
        }}
        className={`absolute right-4 top-4 z-30 rounded-lg px-3 py-2 text-sm font-bold transition ${
          isHeroSlide ? "bg-white/20 text-white hover:bg-white/30" : "bg-white text-gray-700 shadow hover:bg-gray-50"
        }`}
      >
        ← Ir al inicio
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          className={`absolute inset-0 bg-gradient-to-br ${slide.bg}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      </AnimatePresence>

      {!isHeroSlide && (
        <div className="relative z-10 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="font-black text-orange-600 text-lg">LeadFlash</span>
          </div>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(i);
                }}
                className={`w-2 h-2 rounded-full transition-all ${i === currentSlide ? "bg-orange-500 w-6" : "bg-gray-300"}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Slide anterior"
          className={`absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full transition-all ${
            isHeroSlide ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/90 hover:bg-white text-gray-700 shadow"
          }`}
        >
          <ChevronLeft size={24} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Siguiente slide"
          className={`absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full transition-all ${
            isHeroSlide ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/90 hover:bg-white text-gray-700 shadow"
          }`}
        >
          <ChevronRight size={24} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            className={`w-full ${slide.wide ? "max-w-5xl" : "max-w-3xl"}`}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {!isHeroSlide && (
              <div className="mb-4 text-center">
                <span className="text-3xl mb-1 block">{slide.emoji}</span>
                <h2 className="text-2xl font-black text-gray-900 mb-0.5">{slide.title}</h2>
                <p className="text-gray-500 font-bold text-sm">{slide.subtitle}</p>
              </div>
            )}
            {slide.content}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 px-8 py-3 flex items-center justify-between">
        <span className={`text-xs font-bold ${isHeroSlide ? "text-white/60" : "text-gray-400"}`}>
          {currentSlide + 1} / {slides.length}
        </span>
        <span className={`text-xs font-bold ${isHeroSlide ? "text-white/60" : "text-gray-400"}`}>
          ← / → para navegar
        </span>
        <span className={`text-xs font-bold ${isHeroSlide ? "text-white/60" : "text-gray-400"}`}>
          {isPlaying ? "▶ Auto" : "⏸ Pausado"} · Clic para {isPlaying ? "pausar" : "reanudar"}
        </span>
      </div>
    </div>
  );
}
