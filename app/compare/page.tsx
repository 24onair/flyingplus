import { CompareClient } from "@/components/briefing/compare-client";
import { getRuntimeSiteConfigs } from "@/lib/sites/runtime-site-configs";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const siteConfigs = await getRuntimeSiteConfigs();
  return <CompareClient searchParams={resolvedSearchParams} siteConfigs={siteConfigs} />;
}
