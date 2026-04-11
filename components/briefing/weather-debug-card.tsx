import type { FlightBriefingResponse } from "@/types/briefing";

type WeatherDebugCardProps = {
  debug?: FlightBriefingResponse["debug"];
};

export function WeatherDebugCard({ debug }: WeatherDebugCardProps) {
  if (!debug) {
    return null;
  }

  return (
    <section className="rounded-[28px] border border-sky-200 bg-sky-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
        디버그 카드
      </p>
      <h2 className="mt-2 text-xl font-bold text-stone-900">
        실제 불러온 기상값 요약
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        데이터 소스 {debug.dataSource === "open_meteo" ? "Open-Meteo 자동 예보" : "수동 입력"} /
        요청 날짜 {debug.requestedDate}
      </p>
      <p className="mt-1 text-sm text-stone-600">
        비교 모드{" "}
        {debug.comparisonMode === "same_time_compare"
          ? "동일 시각 비교"
          : "지역별 최적 시각"}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {debug.perSiteWeather.map((site) => (
          <article key={site.siteId} className="rounded-2xl border border-sky-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-stone-900">{site.siteName}</p>
              <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                {site.activeTimeUsed ?? site.representativeTime ?? "수동 입력"}
              </span>
            </div>
            {site.sourceModel ? (
              <p className="mt-1 text-xs text-stone-500">{site.sourceModel}</p>
            ) : null}

            <div className="mt-3 space-y-1 text-xs text-stone-500">
              <p>실제 사용 시각: {site.activeTimeUsed ?? "수동 입력"}</p>
              {site.comparisonTime ? <p>비교 기준 시각: {site.comparisonTime}</p> : null}
              {site.representativeTime ? <p>지역 최적 시각: {site.representativeTime}</p> : null}
            </div>

            <div className="mt-3 space-y-2 text-sm text-stone-700">
              <p>
                지상풍 {site.weatherInput.surfaceWindDir} {site.weatherInput.surfaceWindKmh}km/h
              </p>
              <p>
                900m {site.weatherInput.wind900m.dir} {site.weatherInput.wind900m.speedKmh}km/h
              </p>
              <p>
                1200m {site.weatherInput.wind1200m.dir} {site.weatherInput.wind1200m.speedKmh}km/h
              </p>
              <p>
                1500m {site.weatherInput.wind1500m.dir} {site.weatherInput.wind1500m.speedKmh}km/h
              </p>
              <p>
                써멀 {site.weatherInput.thermalMaxMs}m/s / 시작 {site.weatherInput.thermalStartTime}
              </p>
              <p>
                베이스 {site.weatherInput.baseM}m / 구름 {site.weatherInput.cloudCoverPct}% / 강수{" "}
                {site.weatherInput.rainProbabilityPct}%
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
