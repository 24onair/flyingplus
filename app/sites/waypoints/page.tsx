import Link from "next/link";
import { WaypointExportPage } from "@/components/sites/waypoint-export-page";
import { getManageSiteList } from "@/lib/sites/runtime-site-configs";

export const dynamic = "force-dynamic";

type SiteWaypointExportPageProps = {
  searchParams?: Promise<{
    siteId?: string;
  }>;
};

export default async function SiteWaypointExportPage({
  searchParams,
}: SiteWaypointExportPageProps) {
  const sites = await getManageSiteList();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedSiteId = resolvedSearchParams?.siteId?.trim();
  const initialSiteId =
    sites.find((site) => site.siteId === requestedSiteId)?.siteId ?? sites[0]?.siteId ?? "";

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">
            웨이포인트 도구
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              현재 지도 범위의 웨이포인트를
              <br />
              지역 세트로 정리해 내보냅니다.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              기존에 읽어둔 웨이포인트와 직접 추가한 포인트를 한 지도 안에서 함께
              보고, 필요한 이름 수정까지 마친 뒤 범위 기준으로 세트를 내보낼 수
              있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/sites" className="btn btn-secondary">
              활공장 목록으로 돌아가기
            </Link>
            <Link href="/tasks/new" className="btn btn-primary">
              새 타스크 만들기
            </Link>
          </div>
        </div>
      </section>

      <WaypointExportPage
        sites={sites}
        initialSiteId={initialSiteId}
      />
    </div>
  );
}
