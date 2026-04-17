import type { FlightBriefingResponse } from "@/types/briefing";
import type { WindDirection } from "@/types/site";

type SelectedSiteBriefingPanelProps = {
  siteName: string;
  siteDebug?:
    | NonNullable<FlightBriefingResponse["debug"]>["perSiteWeather"][number]
    | null;
};

const directionArrow: Record<WindDirection, string> = {
  N: "↓",
  NNE: "↙",
  NE: "↙",
  ENE: "↙",
  E: "←",
  ESE: "↖",
  SE: "↖",
  SSE: "↖",
  S: "↑",
  SSW: "↗",
  SW: "↗",
  WSW: "↗",
  W: "→",
  WNW: "↘",
  NW: "↘",
  NNW: "↘",
};

export function SelectedSiteBriefingPanel({
  siteName,
  siteDebug,
}: SelectedSiteBriefingPanelProps) {
  if (!siteDebug) {
    return null;
  }

  return (
    <section className="theme-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="theme-kicker theme-kicker-muted">선택 지역 브리핑</p>
          <h1 className="theme-subtitle mt-1 text-[color:var(--text-primary)]">{siteName}</h1>
          <p className="theme-copy mt-2">
            {siteDebug.sourceModel ?? "수동 입력"} / 실제 사용 시각{" "}
            {siteDebug.activeTimeUsed ?? "수동 입력"}
          </p>
        </div>
        <div className="theme-badge px-5 py-2 text-xl font-bold normal-case tracking-normal">
          {siteDebug.activeTimeUsed ?? "--:--"}
        </div>
      </div>

      <div className="theme-callout theme-callout-accent mt-5">
        <div className="space-y-3 text-lg text-[color:var(--text-secondary)]">
          <p>
            지상풍 <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.surfaceWindDir}</span>{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.surfaceWindKmh}km/h</span>
          </p>
          <p>
            900m <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.wind900m.dir}</span>{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.wind900m.speedKmh}km/h</span>
          </p>
          <p>
            1200m <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.wind1200m.dir}</span>{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.wind1200m.speedKmh}km/h</span>
          </p>
          <p>
            1500m <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.wind1500m.dir}</span>{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.wind1500m.speedKmh}km/h</span>
          </p>
          <p>
            써멀 <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.thermalMaxMs}m/s</span> /
            시작 <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.thermalStartTime}</span>
          </p>
          <p>
            베이스 <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.baseM}m</span> / 구름{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.cloudCoverPct}%</span> / 강수{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{siteDebug.weatherInput.rainProbabilityPct}%</span>
          </p>
        </div>
      </div>

      {siteDebug.hourlyTimeline?.length ? (
        <div className="theme-table-shell mt-5 overflow-x-auto">
          <div
            className="grid min-w-[860px]"
            style={{ gridTemplateColumns: `108px repeat(${siteDebug.hourlyTimeline.length}, minmax(72px, 1fr))` }}
          >
            <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--muted)]">
              시간
            </div>
            {siteDebug.hourlyTimeline.map((entry) => (
              <div
                key={`time-${entry.time}`}
                className="border-b border-l border-[color:var(--border-soft)] px-3 py-3 text-center text-lg font-bold text-[color:var(--text-primary)]"
              >
                {entry.time.slice(0, 2)}
              </div>
            ))}

            <div className="bg-[color:var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--muted)]">
              풍향
            </div>
            {siteDebug.hourlyTimeline.map((entry) => (
              <div
                key={`dir-${entry.time}`}
                className="border-l border-[color:var(--border-soft)] px-3 py-3 text-center"
              >
                <div className="text-3xl font-semibold leading-none text-[color:var(--accent)]">
                  {directionArrow[entry.surfaceWindDir]}
                </div>
                <div className="mt-1 text-xs font-semibold text-[color:var(--muted)]">
                  {entry.surfaceWindDir}
                </div>
              </div>
            ))}

            <div className="border-t border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--muted)]">
              풍속
            </div>
            {siteDebug.hourlyTimeline.map((entry) => (
              <div
                key={`speed-${entry.time}`}
                className="border-l border-t border-[color:var(--border-soft)] px-3 py-3 text-center text-lg font-bold text-[color:var(--text-primary)]"
              >
                {entry.surfaceWindKmh}
              </div>
            ))}

            <div className="border-t border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--muted)]">
              써멀
            </div>
            {siteDebug.hourlyTimeline.map((entry) => (
              <div
                key={`thermal-${entry.time}`}
                className="border-l border-t border-[color:var(--border-soft)] px-3 py-3 text-center text-base font-semibold text-[color:var(--green)]"
              >
                {entry.thermalMaxMs.toFixed(1)}
              </div>
            ))}

            <div className="border-t border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--muted)]">
              기온
            </div>
            {siteDebug.hourlyTimeline.map((entry) => (
              <div
                key={`temp-${entry.time}`}
                className="border-l border-t border-[color:var(--border-soft)] px-3 py-3 text-center text-base font-semibold text-[color:var(--warn)]"
              >
                {typeof entry.temperatureC === "number" ? `${entry.temperatureC}°` : "-"}
              </div>
            ))}

            <div className="border-t border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--muted)]">
              1200m
            </div>
            {siteDebug.hourlyTimeline.map((entry) => (
              <div
                key={`upper-${entry.time}`}
                className="border-l border-t border-[color:var(--border-soft)] px-2 py-3 text-center text-xs font-medium leading-5 text-[color:var(--muted)]"
              >
                <div className="text-xl leading-none text-[color:var(--accent)]">
                  {directionArrow[entry.wind1200mDir]}
                </div>
                <div className="mt-1">{entry.wind1200mDir}</div>
                <div>{entry.wind1200mKmh}km/h</div>
              </div>
            ))}

            <div className="border-t border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--muted)]">
              기타
            </div>
            {siteDebug.hourlyTimeline.map((entry) => (
              <div
                key={`etc-${entry.time}`}
                className="border-l border-t border-[color:var(--border-soft)] px-2 py-3 text-center text-xs font-medium leading-5 text-[color:var(--muted)]"
              >
                <div>구름 {entry.cloudCoverPct}%</div>
                <div>강수 {entry.rainProbabilityPct}%</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
