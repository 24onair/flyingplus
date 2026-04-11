import Link from "next/link";
import { LaunchSiteVisibilityManager } from "@/components/sites/launch-site-visibility-manager";
import { getLaunchSiteCatalog } from "@/lib/sites/launch-site-catalog";

export const dynamic = "force-dynamic";

export default async function LaunchSiteCatalogManagePage() {
  const sites = await getLaunchSiteCatalog();

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">
            전국 활공장 표시 관리
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              전국 활공장 원본 목록의
              <br />
              표시 여부를 관리합니다.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              여기서 숨긴 활공장은 활공장 목록 페이지의 전국 원본 지도와 카드 목록에서
              제외됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/sites" className="btn btn-secondary">
              활공장 목록으로
            </Link>
          </div>
        </div>
      </section>

      <LaunchSiteVisibilityManager sites={sites} />
    </div>
  );
}
