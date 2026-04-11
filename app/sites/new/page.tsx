import { SitePageModeContent } from "@/components/sites/site-page-mode-content";
import { getLaunchSiteById } from "@/lib/sites/launch-site-catalog";
import {
  getManageDraftForSite,
  getManageSiteList,
} from "@/lib/sites/runtime-site-configs";
import {
  createDraftFromLaunchSite,
  defaultNewSiteDraft,
} from "@/lib/sites/site-registration";

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedSiteId =
    typeof resolvedSearchParams.siteId === "string"
      ? resolvedSearchParams.siteId
      : null;
  const selectedCatalogSiteId =
    typeof resolvedSearchParams.catalogSiteId === "string"
      ? resolvedSearchParams.catalogSiteId
      : null;
  const selectedDraft = selectedSiteId
    ? await getManageDraftForSite(selectedSiteId)
    : null;
  const selectedLaunchSite = selectedCatalogSiteId
    ? await getLaunchSiteById(selectedCatalogSiteId)
    : null;
  const manageSites = await getManageSiteList();
  const selectedSite = selectedSiteId
    ? manageSites.find((site) => site.siteId === selectedSiteId) ?? null
    : null;
  const initialDraft =
    selectedDraft ??
    (selectedLaunchSite ? createDraftFromLaunchSite(selectedLaunchSite) : defaultNewSiteDraft);
  const isFromManage = Boolean(selectedDraft && selectedSite);
  const isFromCatalog = Boolean(selectedLaunchSite && !selectedDraft);

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              isFromManage
                ? "bg-amber-100 text-amber-900"
                : "bg-sky-100 text-sky-900"
            }`}
          >
            {isFromManage ? "기존 활공장 등록 이어쓰기" : "신규 활공장 등록 초안"}
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              {isFromManage ? (
                <>
                  {selectedSite?.siteName} 설정을
                  <br />
                  등록 페이지에서 이어서 편집합니다.
                </>
              ) : isFromCatalog ? (
                <>
                  {selectedLaunchSite?.sourceName} 정보를
                  <br />
                  정식 활공장 등록 초안으로 가져왔습니다.
                </>
              ) : (
                <>
                  새로운 활공장을
                  <br />
                  운영 데이터 구조에 맞춰 등록합니다.
                </>
              )}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              {isFromManage
                ? "활공장 관리에서 선택한 사이트의 현재 설정을 그대로 가져와 신규 등록 페이지 UI에서 이어서 보강하고 저장할 수 있습니다."
                : isFromCatalog
                  ? "전국 활공장 원본 카드에서 선택한 이름, 좌표, 고도, 풍향 힌트를 등록 페이지 초안에 채워 시작할 수 있습니다."
                : "이름, 좌표, 이륙장/랜딩장, 풍향 기준, 리스크 성향, 웨이포인트 파일 메모를 한 페이지에서 정리하고, 저장 전에 실제 JSON 구조까지 바로 확인할 수 있는 등록 페이지 초안입니다."}
            </p>
          </div>
        </div>
      </section>

      <SitePageModeContent
        initialDraft={initialDraft}
        isFromManage={isFromManage}
        isFromCatalog={isFromCatalog}
        selectedSite={selectedSite}
        selectedLaunchSite={selectedLaunchSite}
        saveEndpoint="/api/sites/manage"
        saveButtonLabel={
          isFromManage
            ? `${selectedSite?.siteName ?? initialDraft.siteName} 등록 페이지에서 저장`
            : "신규 활공장 저장"
        }
        uploadEndpoint="/api/sites/manage/upload"
        refreshOnSave
      />
    </div>
  );
}
