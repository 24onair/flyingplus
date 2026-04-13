import Link from "next/link";
import { BriefingForm } from "@/components/forms/briefing-form";
import { getSiteSummaries } from "@/lib/mock/selectors";
import { buildBriefingRequest } from "@/lib/request/build-briefing-request";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sites = getSiteSummaries();
  const resolvedSearchParams = await searchParams;
  const initialRequest = buildBriefingRequest(resolvedSearchParams);
  const currentParams = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => currentParams.append(key, item));
      return;
    }

    if (typeof value === "string") {
      currentParams.set(key, value);
    }
  });

  const currentQuery = currentParams.toString();

  return (
    <div className="space-y-6">
      <section className="glass relative overflow-hidden rounded-[36px] border px-6 py-8 md:px-10 md:py-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(49,95,246,0.14),transparent_42%),radial-gradient(circle_at_top_right,rgba(15,118,110,0.12),transparent_32%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.92fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex rounded-full border border-emerald-200/70 bg-emerald-50/90 px-3 py-1 text-sm font-semibold text-emerald-900">
                전날 예보 기반 XC 브리핑
              </div>
              <div className="inline-flex rounded-full border border-blue-200/70 bg-blue-50/90 px-3 py-1 text-sm font-semibold text-blue-900">
                Mobile First
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] text-stone-950 md:text-6xl">
                문경, 합천, 고헌산 중 어디가
                <br />
                내일 가장 좋을지 빠르게 판단합니다.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600 md:text-lg">
                풍향, 풍속, 써멀, 베이스, 병목 구간을 한 번에 묶어
                추천 이륙 시간과 메인 코스를 보여주는 모바일 중심 XC
                브리핑 앱입니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,253,249,0.82)] px-4 py-4 shadow-[0_12px_26px_rgba(23,20,17,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Weather
                </p>
                <p className="mt-2 text-lg font-bold tracking-[-0.04em] text-stone-950">
                  풍향 · 풍속
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  시간대별 변화와 추천 풍향 범위를 빠르게 확인
                </p>
              </div>
              <div className="rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,253,249,0.82)] px-4 py-4 shadow-[0_12px_26px_rgba(23,20,17,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Course
                </p>
                <p className="mt-2 text-lg font-bold tracking-[-0.04em] text-stone-950">
                  코스 · 타스크
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  웨이포인트 편집과 XCTrack QR까지 한 흐름으로
                </p>
              </div>
              <div className="rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,253,249,0.82)] px-4 py-4 shadow-[0_12px_26px_rgba(23,20,17,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Flight Ops
                </p>
                <p className="mt-2 text-lg font-bold tracking-[-0.04em] text-stone-950">
                  이륙 판단
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  추천 시간대와 병목 구간을 한 화면에서 정리
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={currentQuery ? `/briefing?${currentQuery}` : "/briefing"}
                className="btn btn-primary"
              >
                샘플 브리핑 보기
              </Link>
              <Link
                href={currentQuery ? `/compare?${currentQuery}` : "/compare"}
                className="btn btn-secondary"
              >
                지역 비교 보기
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,253,249,0.96),rgba(248,243,235,0.92))] p-5 shadow-[0_22px_48px_rgba(23,20,17,0.08)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-stone-500">빠른 시작</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-stone-950">
                  내일 분석할 지역 선택
                </h2>
              </div>
              <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Forecast
              </div>
            </div>
            <div className="mb-4 rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.62)] px-4 py-3 text-sm leading-6 text-stone-600">
              기본 날짜와 대표 지역을 정한 뒤 바로 브리핑 또는 지역 비교로
              넘어갈 수 있습니다.
            </div>
            <BriefingForm sites={sites} initialRequest={initialRequest} />
          </div>
        </div>
      </section>
    </div>
  );
}
