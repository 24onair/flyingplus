"use client";

type SelectedDateCardProps = {
  date: string;
  label?: string;
  tone?: "default" | "accent";
};

function formatKoreanDate(date: string) {
  if (!date) return "날짜 미선택";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

export function SelectedDateCard({ date, label = "선택 날짜", tone = "default" }: SelectedDateCardProps) {
  const isAccent = tone === "accent";
  return (
      <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 4,
        padding: "12px 20px",
        borderRadius: 4,
        border: isAccent ? "1px solid rgba(14,165,233,0.4)" : "1px solid #5E5E5E",
        background: isAccent ? "rgba(14,165,233,0.08)" : "#FFFFFF",
        boxShadow: "rgba(0, 0, 0, 0.3) 0px 0px 5px 0px",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: isAccent ? "#0EA5E9" : "#757575", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 16, fontWeight: 700, color: "#000000", margin: 0 }}>
        {formatKoreanDate(date)}
      </p>
    </div>
  );
}
