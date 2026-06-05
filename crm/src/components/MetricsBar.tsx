interface MetricsBarProps {
  totalToday: number;
  answered: number;
  noAnswer: number;
  contactRate: number;
}

const MetricsBar = ({ totalToday, answered, noAnswer, contactRate }: MetricsBarProps) => {
  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-1.5 border-b border-border bg-card/50">
      <MetricItem label="Leads hoy" value={totalToday} color="text-foreground" />
      <MetricItem label="Contestados" value={answered} color="text-success" />
      <MetricItem label="No contestados" value={noAnswer} color="text-muted-foreground" />
      <MetricItem label="Tasa contacto" value={`${contactRate}%`} color="text-accent" />
    </div>
  );
};

function MetricItem({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-0.5">
      <span className={`text-lg font-black font-mono ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default MetricsBar;
