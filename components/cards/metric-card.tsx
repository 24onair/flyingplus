type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "warning";
};

const toneStyles: Record<
  NonNullable<MetricCardProps["tone"]>,
  { bg: string; border: string; labelColor: string; valueColor: string; hintColor: string }
> = {
  default: {
    bg: "#FFFFFF",
    border: "#5E5E5E",
    labelColor: "#757575",
    valueColor: "#000000",
    hintColor: "#757575",
  },
  accent: {
    bg: "#1A1A1A",
    border: "#5E5E5E",
    labelColor: "#0EA5E9",
    valueColor: "#FFFFFF",
    hintColor: "#A7A7A7",
  },
  warning: {
    bg: "rgba(239,145,0,0.08)",
    border: "rgba(239,145,0,0.35)",
    labelColor: "#DF6500",
    valueColor: "#000000",
    hintColor: "#757575",
  },
};

export function MetricCard({ label, value, hint, tone = "default" }: MetricCardProps) {
  const s = toneStyles[tone];
  return (
    <article
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 4,
        padding: "20px 20px",
        boxShadow: "rgba(0, 0, 0, 0.3) 0px 0px 5px 0px",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: s.labelColor, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: s.valueColor, margin: "8px 0 0" }}>
        {value}
      </p>
      {hint ? (
        <p style={{ fontSize: 13, color: s.hintColor, margin: "6px 0 0" }}>
          {hint}
        </p>
      ) : null}
    </article>
  );
}
