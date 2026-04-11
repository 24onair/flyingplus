import { promises as fs } from "fs";
import path from "path";
import { koreaLaunchSites } from "@/data/sites/korea-launch-sites";
import { extractLaunchSiteWindHint } from "@/lib/sites/launch-site-wind";
import { detectLaunchSiteRegion } from "@/lib/sites/launch-site-region";

const visibilityPath = path.join(
  process.cwd(),
  "data",
  "sites",
  "launch-site-visibility.json"
);

export type LaunchSiteVisibilityMap = Record<string, boolean>;

export function filterWeatherLinks(links: string[]) {
  return links.filter((link) => {
    const normalized = link.toLowerCase();
    return (
      normalized.includes("windguru") ||
      normalized.includes("windy.com") ||
      normalized.includes("kma.go.kr")
    );
  });
}

export async function readLaunchSiteVisibilityMap(): Promise<LaunchSiteVisibilityMap> {
  try {
    const raw = await fs.readFile(visibilityPath, "utf8");
    return JSON.parse(raw) as LaunchSiteVisibilityMap;
  } catch {
    return {};
  }
}

async function writeLaunchSiteVisibilityMap(data: LaunchSiteVisibilityMap) {
  await fs.writeFile(visibilityPath, JSON.stringify(data, null, 2), "utf8");
}

export async function setLaunchSiteVisibility(siteId: string, visible: boolean) {
  const current = await readLaunchSiteVisibilityMap();
  current[siteId] = visible;
  await writeLaunchSiteVisibilityMap(current);
  return current;
}

export async function getLaunchSiteCatalog() {
  const visibility = await readLaunchSiteVisibilityMap();

  return koreaLaunchSites.map((site) => ({
    ...site,
    windHint: site.windHint ?? extractLaunchSiteWindHint(site.descriptionText),
    sourceLinks: filterWeatherLinks(site.sourceLinks),
    regionLabel: detectLaunchSiteRegion(site),
    visible: visibility[site.id] ?? true,
  }));
}

export async function getVisibleLaunchSites() {
  const catalog = await getLaunchSiteCatalog();
  return catalog.filter((site) => site.visible);
}

export async function getLaunchSiteById(siteId: string) {
  const catalog = await getLaunchSiteCatalog();
  return catalog.find((site) => site.id === siteId) ?? null;
}
