import type { SiteRanking } from "@/types/briefing";

const statusTone: Record<SiteRanking["status"], string> = {
  recommended: "border-[rgba(14,165,233,0.35)] bg-[rgba(14,165,233,0.08)]",
  available: "border-[color:var(--line)] bg-white",
  caution: "border-[rgba(223,101,0,0.35)] bg-[rgba(223,101,0,0.08)]",
  not_recommended: "border-[rgba(229,32,32,0.35)] bg-[rgba(229,32,32,0.08)]",
};

export function ComparisonBoard({ rankings }: { rankings: SiteRanking[] }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="theme-kicker theme-kicker-muted">지역 비교</p>
        <h1 className="theme-subtitle mt-1 text-[color:var(--text-primary)]">
          오늘의 후보 지역 3곳
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {rankings.map((ranking) => (
          <article
            key={ranking.siteId}
            className={`rounded-[4px] border p-5 shadow-[var(--shadow-card)] ${statusTone[ranking.status]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="theme-kicker theme-kicker-muted !mb-1">
                  {ranking.statusLabel}
                </p>
                <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
                  {ranking.siteName}
                </h2>
              </div>
              <div className="rounded-[4px] border border-[color:var(--border-soft)] bg-white px-3 py-2 text-right">
                <p className="theme-kicker theme-kicker-muted !mb-1">
                  score
                </p>
                <p className="text-2xl font-bold text-[color:var(--text-primary)]">{ranking.score}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[4px] border border-[color:var(--border-soft)] bg-white p-3">
                <p className="theme-kicker theme-kicker-muted !mb-1">
                  등급
                </p>
                <p className="mt-2 font-semibold text-[color:var(--text-primary)]">
                  {ranking.gradeLabel}
                </p>
              </div>
              <div className="rounded-[4px] border border-[color:var(--border-soft)] bg-white p-3">
                <p className="theme-kicker theme-kicker-muted !mb-1">
                  핵심 포인트
                </p>
                <p className="mt-2 font-semibold text-[color:var(--text-primary)]">
                  {ranking.highlight}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
