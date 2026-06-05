import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface GuidedTourProps {
  page: 'executive' | 'advisor' | 'admin';
  isDemo?: boolean;
}

const executiveSteps: Step[] = [
  {
    target: 'body',
    content: '¡Bienvenido a LeadFlash! 🚀 Esta es la vista de Ejecutiva, donde gestionarás los leads entrantes en tiempo real. Te guiaremos por las funciones principales.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="metrics-bar"]',
    content: '📊 Aquí ves las métricas del día: total de leads, contestados, no contestados y tu tasa de contacto. ¡Tu objetivo es maximizar la tasa!',
    placement: 'bottom',
  },
  {
    target: '[data-tour="priority-panel"]',
    content: '🚨 Este es el Panel de Prioridad. Aquí aparece el lead más urgente para llamar. Los leads nuevos llegan con una alerta sonora y visual.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="priority-circle"]',
    content: '🎯 Este círculo indica la prioridad del lead. Viene en blanco por defecto. Haz clic para asignar: 🟢 Alta, ⚪ Media o 🔴 Baja. ¡Úsalo para organizar tu gestión!',
    placement: 'bottom',
  },
  {
    target: '[data-tour="call-button"]',
    content: '📞 ¡El botón más importante! Al hacer clic, se inicia la llamada al lead. El sistema registra automáticamente el intento.',
    placement: 'top',
  },
  {
    target: '[data-tour="action-buttons"]',
    content: '🎯 Después de cada llamada, registra el resultado: contestó, no contestó, ocupado, etc. Esto alimenta las estadísticas y el motor de reintentos.',
    placement: 'top',
  },
  {
    target: '[data-tour="pending-sidebar"]',
    content: '📋 Aquí se acumulan los leads pendientes. Puedes seleccionar cualquiera para priorizarlo manualmente.',
    placement: 'left',
  },
  {
    target: '[data-tour="alert-activator"]',
    content: '🔔 Activa las alertas sonoras para recibir notificaciones cuando lleguen nuevos leads. ¡Es fundamental para no perder oportunidades!',
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-advisor"]',
    content: '🧑‍💼 Desde aquí puedes ir a la vista de Asesorías, donde los leads avanzan por el proceso de venta (agendamiento, asesoría, reserva, cierre).',
    placement: 'bottom',
  },
];

const advisorSteps: Step[] = [
  {
    target: 'body',
    content: '¡Bienvenido a la vista de Asesorías! 🏠 Aquí gestionarás el avance comercial de cada lead a través de un tablero Kanban.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="kanban-board"]',
    content: '📋 Este es el tablero Kanban. Cada columna representa una etapa del proceso: Asesoría Agendada → Concretada → Plan Presentado → Reservado → Cierre.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="kanban-card"]',
    content: '🃏 Cada tarjeta es un lead. Puedes arrastrarla entre columnas para cambiar su estado, o hacer clic para ver el detalle completo.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="search-filter"]',
    content: '🔍 Usa la barra de búsqueda para encontrar leads por nombre, teléfono o RUT. También puedes filtrar por mes y asesor.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="stats-toggle"]',
    content: '📈 Activa las estadísticas para ver gráficos de rendimiento: distribución por estado, tendencias mensuales, reservas y cierres por proyecto.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="export-button"]',
    content: '📥 Exporta todos los leads a Excel con un clic. Ideal para reportes y análisis fuera de la plataforma.',
    placement: 'bottom',
  },
];

const adminSteps: Step[] = [
  {
    target: 'body',
    content: '¡Dashboard CEO! 📊 Desde aquí tienes una vista completa del rendimiento de tu equipo comercial.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="admin-date-filter"]',
    content: '📅 Filtra por rango de fechas para analizar el rendimiento en cualquier período. Usa los accesos rápidos (Hoy, 7d, 30d, 3m).',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-tabs"]',
    content: '📊 Navega entre las vistas: General (métricas globales), Ejecutivas (desempeño de telemarketing) y Asesores (avance de asesorías).',
    placement: 'bottom',
  },
];

const stepsByPage: Record<string, Step[]> = {
  executive: executiveSteps,
  advisor: advisorSteps,
  admin: adminSteps,
};

const tourStyles = {
  options: {
    primaryColor: 'hsl(0, 84%, 60%)',
    backgroundColor: 'hsl(240, 10%, 10%)',
    textColor: 'hsl(0, 0%, 95%)',
    arrowColor: 'hsl(240, 10%, 10%)',
    overlayColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10000,
  },
  buttonNext: {
    backgroundColor: 'hsl(0, 84%, 60%)',
    color: '#fff',
    borderRadius: '8px',
    padding: '8px 20px',
    fontWeight: 700,
    fontSize: '14px',
  },
  buttonBack: {
    color: 'hsl(0, 0%, 70%)',
    marginRight: 10,
    fontSize: '14px',
  },
  buttonSkip: {
    color: 'hsl(0, 0%, 50%)',
    fontSize: '13px',
  },
  tooltip: {
    borderRadius: '12px',
    padding: '20px',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  tooltipTitle: {
    fontSize: '16px',
    fontWeight: 800,
  },
};

export default function GuidedTour({ page, isDemo }: GuidedTourProps) {
  const [run, setRun] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Always show the prompt when entering a module in demo mode
  useEffect(() => {
    if (!isDemo) return;
    // Small delay so the page renders first and data-tour targets exist
    const timer = setTimeout(() => setShowPrompt(true), 1500);
    return () => clearTimeout(timer);
  }, [page, isDemo]);

  if (!isDemo) return null;

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
    }
  };

  const startTour = () => {
    setShowPrompt(false);
    // Small delay to ensure prompt is hidden before Joyride starts
    setTimeout(() => setRun(true), 100);
  };

  const dismissTour = () => {
    setShowPrompt(false);
  };

  const steps = stepsByPage[page] || [];

  return (
    <>
      {showPrompt && !run && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
          {/* Bouncing arrow pointing down to the prompt */}
          <div className="flex flex-col items-center animate-bounce mr-4">
            <span className="text-primary font-black text-sm tracking-wide">¡Empieza aquí!</span>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M12 4v14m0 0l-5-5m5 5l5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="bg-card border-2 border-primary/50 rounded-2xl shadow-2xl p-5 max-w-sm animate-slide-up ring-2 ring-primary/20">
            <p className="font-bold text-foreground mb-1 text-base">🎓 ¡Bienvenido a la demo!</p>
            <p className="text-sm text-muted-foreground mb-4">
              Haz un recorrido guiado para conocer todas las funciones de esta vista en menos de 1 minuto.
            </p>
            <div className="flex gap-2">
              <button
                onClick={startTour}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 animate-pulse"
              >
                🚀 Iniciar visita guiada
              </button>
              <button
                onClick={dismissTour}
                className="px-4 py-2 text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Saltar
              </button>
            </div>
          </div>
        </div>
      )}
      <Joyride
        steps={steps}
        run={run}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        callback={handleCallback}
        styles={tourStyles}
        locale={{
          back: 'Anterior',
          close: 'Cerrar',
          last: '¡Listo!',
          next: 'Siguiente →',
          skip: 'Saltar tour',
          open: 'Abrir',
          nextLabelWithProgress: `Siguiente → ({step}/{steps})`,
        }}
        floaterProps={{
          styles: {
            floater: { filter: 'none' },
          },
        }}
      />
    </>
  );
}
