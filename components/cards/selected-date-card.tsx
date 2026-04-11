"use client";

type SelectedDateCardProps = {
  date: string;
  label?: string;
  tone?: "default" | "accent";
};

function formatKoreanDate(date: string) {
  if (!date) {
    return "날짜 미선택";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

export function SelectedDateCard({
  date,
  label = "선택 날짜",
  tone = "default",
}: SelectedDateCardProps) {
  const tones =
    tone === "accent"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : "border-stone-200 bg-white/80 text-stone-900";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{formatKoreanDate(date)}</p>
    </div>
  );
}
