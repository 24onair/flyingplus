"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/components/auth/auth-provider";
import type { KoreaLaunchSite } from "@/types/launch-site";
import type { ManageSiteListItem } from "@/types/manage-site";

const LaunchSitesOverview = dynamic(
  () =>
    import("@/components/sites/launch-sites-overview").then((module) => ({
      default: module.LaunchSitesOverview,
    })),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-[28px] border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm">
        전국 활공장 지도를 불러오는 중입니다.
      </section>
    ),
  }
);

const ManageSitesOverview = dynamic(
  () =>
    import("@/components/sites/manage-sites-overview").then((module) => ({
      default: module.ManageSitesOverview,
    })),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-[28px] border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm">
        운영 활공장 지도를 불러오는 중입니다.
      </section>
    ),
  }
);

export function SitesPageContent({
  visibleLaunchSites,
  managedSites,
}: {
  visibleLaunchSites: KoreaLaunchSite[];
  managedSites: ManageSiteListItem[];
}) {
  const { profile } = useAuth();
  const isAdmin = Boolean(profile?.isAdmin);

  return (
    <>
      <LaunchSitesOverview sites={visibleLaunchSites} managedSites={managedSites} />
      <ManageSitesOverview sites={managedSites} readOnly={!isAdmin} />
    </>
  );
}
