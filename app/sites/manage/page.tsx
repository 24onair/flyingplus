import Link from "next/link";
import { ManageSiteSelector } from "@/components/sites/manage-site-selector";
import { ManageSiteToolbar } from "@/components/sites/manage-site-toolbar";
import { SiteRegistrationForm } from "@/components/sites/site-registration-form";
import {
  getManageDraftForSite,
  getManageSiteList,
} from "@/lib/sites/runtime-site-configs";

export const dynamic = "force-dynamic";

function formatUpdatedAt(updatedAt: string | null) {
  if (!updatedAt) {
    return "기본 설정 사용 중";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(updatedAt));
}

export default async function ManageSitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sites = await getManageSiteList();
  const resolvedSearchParams = await searchParams;
  const selectedSiteId =
    typeof resolvedSearchParams.siteId === "string"
      ? resolvedSearchParams.siteId
      : sites[0]?.siteId;
  const selectedSite =
    sites.find((site) => site.siteId === selectedSiteId) ?? sites[0];
  const selectedDraft = await getManageDraftForSite(selectedSite?.siteId ?? "");

  if (!selectedSite || !selectedDraft) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
            기존 활공장 관리자
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              기존 활공장을 같은 편집 UI로 열고,
              <br />
              저장 상태까지 함께 관리합니다.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              목록 페이지에서 활공장을 선택한 뒤, 등록 페이지와 같은 UI로 수정하고
              마지막 수정 시각과 기본값 되돌리기까지 한 번에 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/sites"
              className="btn btn-secondary"
            >
              활공장 목록으로
            </Link>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">등록 페이지 이동</p>
            <p className="mt-1 text-sm text-stone-700">
              아래 카드 전체를 누르거나, 현재 선택된 활공장을 등록 페이지에서 바로 이어서 편집할 수 있습니다.
            </p>
            <div className="mt-3">
              <Link
                href={`/sites/new?siteId=${selectedSite.siteId}`}
                className="btn btn-primary"
              >
                {selectedSite.siteName} 등록 페이지로 이동
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-stone-200 bg-white/85 p-4">
            <p className="text-sm font-semibold text-stone-900">등록 페이지 빠른 이동</p>
            <p className="mt-1 text-sm text-stone-600">
              아래 버튼은 서버 렌더로 바로 보여서 페이지가 뜨자마자 눌러 이동할 수 있습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sites.map((site) => (
                <Link
                  key={`new-${site.siteId}`}
                  href={`/sites/new?siteId=${site.siteId}`}
                  className={`btn ${
                    site.siteId === selectedSite.siteId ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {site.siteName} 등록
                </Link>
              ))}
            </div>
          </div>
          <ManageSiteSelector
            sites={sites}
            selectedSiteId={selectedSite.siteId}
          />
        </div>
      </section>

      <ManageSiteToolbar
        siteId={selectedSite.siteId}
        siteName={selectedSite.siteName}
        updatedAtLabel={formatUpdatedAt(selectedSite.updatedAt)}
        hasOverride={selectedSite.hasOverride}
      />

      <SiteRegistrationForm
        initialDraft={selectedDraft}
        saveEndpoint="/api/sites/manage"
        saveButtonLabel={`${selectedSite.siteName} 설정 저장`}
        uploadEndpoint="/api/sites/manage/upload"
        refreshOnSave
      />
    </div>
  );
}
