import { MetricCard } from "@/components/cards/metric-card";
import type { FlightBriefingResponse } from "@/types/briefing";

export function BriefingDashboard({
  briefing,
  selectedSiteId,
}: {
  briefing: FlightBriefingResponse;
  selectedSiteId: string;
}) {
  const selectedDetail =
    briefing.siteDetails.find((detail) => detail.siteId === selectedSiteId) ??
    briefing.siteDetails[0];

  if (!selectedDetail) {
    return (
      <section className="glass rounded-[28px] border p-5">
        <p className="text-sm font-semibold text-stone-500">선택 지역 상세</p>
        <p className="mt-2 text-base text-stone-700">
          선택한 활공장에 대한 상세 브리핑 데이터를 아직 만들지 못했습니다.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-red-200 bg-red-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
          위험 경고 우선
        </p>
        <div className="mt-3 space-y-3">
          {selectedDetail.warnings.map((warning) => (
            <div
              key={warning.code}
              className="rounded-2xl border border-red-200 bg-white px-4 py-3"
            >
              <p className="font-semibold text-red-900">{warning.title}</p>
              <p className="mt-1 text-sm text-red-800">{warning.message}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="선택 지역"
          value={selectedDetail.siteName}
          hint={selectedDetail.highlight}
          tone="accent"
        />
        <MetricCard
          label="XC 적합도"
          value={`${selectedDetail.score}점 / ${selectedDetail.flightGradeLabel}`}
          hint="선택 활공장 기준 점수화 결과"
        />
        <MetricCard
          label="추천 이륙 시간"
          value={`${selectedDetail.recommendedLaunchWindow.start} - ${selectedDetail.recommendedLaunchWindow.end}`}
          hint={selectedDetail.recommendedLaunchWindow.label}
          tone="warning"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="glass rounded-[28px] border p-5">
          <p className="text-sm font-semibold text-stone-500">메인 추천 코스</p>
          <h2 className="mt-2 text-2xl font-bold text-stone-900">
            {selectedDetail.recommendedPlan.courseName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            예상 거리 {selectedDetail.recommendedPlan.distanceKm.expected}km, 목표 범위{" "}
            {selectedDetail.recommendedPlan.distanceKm.min}-
            {selectedDetail.recommendedPlan.distanceKm.max}km
          </p>

          <div className="mt-5 space-y-3">
            {selectedDetail.recommendedPlan.turnpoints.map((turnpoint) => (
              <div
                key={turnpoint.order}
                className="flex items-center justify-between rounded-2xl bg-stone-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-stone-900">
                    {turnpoint.order}
                  </span>
                  <span className="font-medium text-stone-800">{turnpoint.name}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  턴포인트
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="glass rounded-[28px] border p-5">
          <p className="text-sm font-semibold text-stone-500">대안 플랜</p>
          <h2 className="mt-2 text-xl font-bold text-stone-900">
            {selectedDetail.alternativePlan.courseName}
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {selectedDetail.alternativePlan.reason}
          </p>

          <div className="mt-6 rounded-2xl bg-stone-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              핵심 병목
            </p>
            <div className="mt-3 space-y-3">
              {selectedDetail.bottlenecks.map((bottleneck) => (
                <div key={bottleneck.id} className="rounded-2xl bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-stone-900">{bottleneck.name}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                      {bottleneck.type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{bottleneck.message}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="glass rounded-[28px] border p-5">
        <p className="text-sm font-semibold text-stone-500">점수 근거</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {selectedDetail.scoreBreakdown.map((item) => (
            <div key={item.factor} className="rounded-2xl bg-stone-100 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-stone-900">{item.factorLabel}</p>
                <p className="text-sm font-bold text-stone-700">
                  {item.score}/{item.maxScore}
                </p>
              </div>
              <p className="mt-2 text-sm text-stone-600">{item.reason}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
