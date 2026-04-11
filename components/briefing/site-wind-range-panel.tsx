import { WindSectorPicker } from "@/components/sites/wind-sector-picker";
import type { SiteConfig, WindDirection } from "@/types/site";

export function SiteWindRangePanel({
  sites,
  title,
  description,
  actualDirections = {},
}: {
  sites: SiteConfig[];
  title: string;
  description: string;
  actualDirections?: Record<string, WindDirection | undefined>;
}) {
  if (sites.length === 0) {
    return null;
  }

  return (
    <section className="glass rounded-[28px] border p-5">
      <p className="text-sm font-semibold text-stone-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {sites.map((site) => (
          <WindSectorPicker
            key={site.siteId}
            title={`${site.siteName} 추천 풍향`}
            description={`${site.launch.name} 기준 풍향 범위입니다.`}
            value={site.preferredWind}
            mode="readonly"
            actualDirection={actualDirections[site.siteId]}
          />
        ))}
      </div>
    </section>
  );
}
