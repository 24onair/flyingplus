type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "warning";
};

const toneClass: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "bg-white text-stone-900",
  accent: "bg-emerald-50 text-emerald-950",
  warning: "bg-amber-50 text-amber-950",
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: MetricCardProps) {
  return (
    <article className={`rounded-[24px] border border-stone-200 p-4 ${toneClass[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-2 text-sm text-stone-600">{hint}</p> : null}
    </article>
  );
}
