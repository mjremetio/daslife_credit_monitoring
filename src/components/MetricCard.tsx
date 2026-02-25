interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  accent?: "blue" | "amber" | "green" | "red";
}

const accentStyles: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  blue: "from-sky-500/15 to-sky-500/5 border-sky-200 text-sky-900",
  amber: "from-amber-400/20 to-amber-400/5 border-amber-200 text-amber-900",
  green: "from-emerald-400/20 to-emerald-400/5 border-emerald-200 text-emerald-900",
  red: "from-rose-400/20 to-rose-400/5 border-rose-200 text-rose-900",
};

export function MetricCard({ label, value, helper, accent = "blue" }: MetricCardProps) {
  const accentClass = accentStyles[accent];
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accentClass} shadow-sm`}> 
      <div className="p-4">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
      </div>
    </div>
  );
}
