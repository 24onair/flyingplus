import { BriefingClient } from "@/components/briefing/briefing-client";
import { getRuntimeSiteConfigs } from "@/lib/sites/runtime-site-configs";

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const siteConfigs = await getRuntimeSiteConfigs();
  return <BriefingClient searchParams={resolvedSearchParams} siteConfigs={siteConfigs} />;
}
