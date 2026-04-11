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
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-5">
            <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900">
              전날 예보 기반 XC 브리핑
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
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

          <div className="glass rounded-[28px] border p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-stone-500">빠른 시작</p>
              <h2 className="mt-1 text-xl font-bold text-stone-900">
                내일 분석할 지역 선택
              </h2>
            </div>
            <BriefingForm sites={sites} initialRequest={initialRequest} />
          </div>
        </div>
      </section>
    </div>
  );
}
