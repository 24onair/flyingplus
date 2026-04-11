import type { SiteRanking } from "@/types/briefing";

const statusTone: Record<SiteRanking["status"], string> = {
  recommended: "border-emerald-300 bg-emerald-50",
  available: "border-stone-200 bg-white",
  caution: "border-amber-200 bg-amber-50",
  not_recommended: "border-red-200 bg-red-50",
};

export function ComparisonBoard({ rankings }: { rankings: SiteRanking[] }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-stone-500">지역 비교</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900">
          오늘의 후보 지역 3곳
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {rankings.map((ranking) => (
          <article
            key={ranking.siteId}
            className={`rounded-[28px] border p-5 ${statusTone[ranking.status]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-500">
                  {ranking.statusLabel}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-stone-900">
                  {ranking.siteName}
                </h2>
              </div>
              <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  score
                </p>
                <p className="text-2xl font-bold text-stone-900">{ranking.score}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  등급
                </p>
                <p className="mt-2 font-semibold text-stone-900">
                  {ranking.gradeLabel}
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  핵심 포인트
                </p>
                <p className="mt-2 font-semibold text-stone-900">
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
