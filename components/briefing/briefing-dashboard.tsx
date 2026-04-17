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
      <section style={{ background: "#FFFFFF", border: "1px solid #5E5E5E", borderRadius: 4, padding: 20, boxShadow: "rgba(0,0,0,0.3) 0px 0px 5px 0px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#757575", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>선택 지역 상세</p>
        <p style={{ fontSize: 15, color: "#000000", margin: 0 }}>선택한 활공장에 대한 상세 브리핑 데이터를 아직 만들지 못했습니다.</p>
      </section>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Warnings — dark section */}
      {selectedDetail.warnings.length > 0 && (
        <section style={{ background: "#111111", borderRadius: 4, padding: 24, border: "1px solid #1f1f1f", boxShadow: "rgba(0,0,0,0.3) 0px 0px 5px 0px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#E52020", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 16px" }}>
            위험 경고 우선
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedDetail.warnings.map((warning) => (
              <div
                key={warning.code}
                style={{
                  background: "#1A1A1A",
                  border: "1px solid rgba(229,32,32,0.3)",
                  borderRadius: 4,
                  padding: "14px 16px",
                }}
              >
                <p style={{ fontWeight: 700, color: "#E52020", margin: 0, fontSize: 15 }}>{warning.title}</p>
                <p style={{ marginTop: 4, fontSize: 14, color: "#A7A7A7", margin: "4px 0 0" }}>{warning.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Metric cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
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
          value={`${selectedDetail.recommendedLaunchWindow.start} – ${selectedDetail.recommendedLaunchWindow.end}`}
          hint={selectedDetail.recommendedLaunchWindow.label}
          tone="warning"
        />
      </section>

      {/* Main course + alternative — light section */}
      <section style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
        <article style={{ background: "#FFFFFF", border: "1px solid #5E5E5E", borderRadius: 4, padding: 24, boxShadow: "rgba(0,0,0,0.3) 0px 0px 5px 0px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#757575", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>메인 추천 코스</p>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#000000", margin: "8px 0 8px" }}>
            {selectedDetail.recommendedPlan.courseName}
          </h2>
          <p style={{ fontSize: 14, color: "#757575", margin: 0, lineHeight: 1.6 }}>
            예상 거리 {selectedDetail.recommendedPlan.distanceKm.expected}km, 목표 범위{" "}
            {selectedDetail.recommendedPlan.distanceKm.min}–{selectedDetail.recommendedPlan.distanceKm.max}km
          </p>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedDetail.recommendedPlan.turnpoints.map((turnpoint) => (
              <div
                key={turnpoint.order}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#FFFFFF",
                  border: "1px solid #E5E5E5",
                  borderRadius: 4,
                  padding: "10px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    display: "inline-flex",
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    background: "#0EA5E9",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {turnpoint.order}
                  </span>
                  <span style={{ fontWeight: 700, color: "#000000", fontSize: 14 }}>{turnpoint.name}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#757575", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  턴포인트
                </span>
              </div>
            ))}
          </div>
        </article>

        <article style={{ background: "#FFFFFF", border: "1px solid #5E5E5E", borderRadius: 4, padding: 24, boxShadow: "rgba(0,0,0,0.3) 0px 0px 5px 0px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#757575", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>대안 플랜</p>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#000000", margin: "8px 0 12px" }}>
            {selectedDetail.alternativePlan.courseName}
          </h2>
          <p style={{ fontSize: 14, color: "#757575", lineHeight: 1.6, margin: 0 }}>
            {selectedDetail.alternativePlan.reason}
          </p>

          <div style={{ marginTop: 20, background: "#F7F7F7", borderRadius: 4, padding: 16, border: "1px solid #E5E5E5" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#757575", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>
              핵심 병목
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedDetail.bottlenecks.map((bottleneck) => (
                <div key={bottleneck.id} style={{ background: "#FFFFFF", borderRadius: 4, padding: "12px 14px", border: "1px solid #E5E5E5" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ fontWeight: 700, color: "#000000", margin: 0, fontSize: 14 }}>{bottleneck.name}</p>
                    <span style={{
                      display: "inline-flex",
                      padding: "2px 8px",
                      borderRadius: 2,
                      fontSize: 11,
                      fontWeight: 700,
                      background: "rgba(239,145,0,0.12)",
                      color: "#DF6500",
                      whiteSpace: "nowrap",
                    }}>
                      {bottleneck.type}
                    </span>
                  </div>
                  <p style={{ marginTop: 6, fontSize: 13, color: "#757575", margin: "6px 0 0" }}>{bottleneck.message}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section style={{ background: "#111111", borderRadius: 4, padding: 24, border: "1px solid #1f1f1f", boxShadow: "rgba(0,0,0,0.3) 0px 0px 5px 0px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#0EA5E9", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 16px" }}>
          점수 근거
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {selectedDetail.scoreBreakdown.map((item) => (
            <div
              key={item.factor}
              style={{
                background: "#1A1A1A",
                borderRadius: 4,
                padding: "14px 16px",
                border: "1px solid #2a2a2a",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontWeight: 600, color: "#FFFFFF", margin: 0, fontSize: 14 }}>{item.factorLabel}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0EA5E9", margin: 0 }}>
                  {item.score}/{item.maxScore}
                </p>
              </div>
              <p style={{ marginTop: 6, fontSize: 13, color: "#A7A7A7", margin: "6px 0 0" }}>{item.reason}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
