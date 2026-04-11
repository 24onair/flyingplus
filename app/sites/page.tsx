import Link from "next/link";
import { SitesPageContent } from "@/components/sites/sites-page-content";
import { getVisibleLaunchSites } from "@/lib/sites/launch-site-catalog";
import { getManageSiteList } from "@/lib/sites/runtime-site-configs";

export const dynamic = "force-dynamic";

export default async function SitesIndexPage() {
  const sites = await getManageSiteList();
  const visibleLaunchSites = await getVisibleLaunchSites();

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
            활공장 목록
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              전국 활공장과 주요 운영 활공장을
              <br />
              한 곳에서 함께 확인합니다.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              먼저 전국 활공장 지도를 보고, 아래에서 현재 서비스에 연결된 주요 활공장의
              이륙장 위치와 기본 정보를 함께 확인할 수 있습니다. 필요할 때만 별도 관리
              화면으로 이동해 수정하면 됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sites/new"
              className="btn btn-primary"
            >
              신규 활공장 등록
            </Link>
            <Link
              href="/sites/catalog"
              className="btn btn-secondary"
            >
              전국 활공장 표시 설정
            </Link>
          </div>
        </div>
      </section>

      <SitesPageContent
        visibleLaunchSites={visibleLaunchSites}
        managedSites={sites}
      />
    </div>
  );
}
