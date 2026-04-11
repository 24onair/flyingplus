import { promises as fs } from "fs";
import path from "path";
import { siteConfigs, siteSummaries } from "@/data/sites/config";
import { koreaLaunchSites } from "@/data/sites/korea-launch-sites";
import { createDraftFromSiteConfig } from "@/lib/sites/site-registration";
import { filterWeatherLinks } from "@/lib/sites/launch-site-catalog";
import type { SiteConfig } from "@/types/site";
import type { ManageSiteListItem } from "@/types/manage-site";
import type { NewSiteRegistrationDraft } from "@/types/site-registration";

const overridesPath = path.join(
  process.cwd(),
  "data",
  "sites",
  "site-overrides.json"
);

type SiteOverrideEntry = {
  draft: NewSiteRegistrationDraft;
  updatedAt: string | null;
};
type SiteOverrideEntryMap = Record<string, SiteOverrideEntry>;

function isOverrideEntry(value: unknown): value is SiteOverrideEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "draft" in value;
}

async function readOverridesFile(): Promise<SiteOverrideEntryMap> {
  try {
    const raw = await fs.readFile(overridesPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(parsed).map(([siteId, value]) => {
        if (isOverrideEntry(value)) {
          return [
            siteId,
            {
              draft: value.draft,
              updatedAt: value.updatedAt ?? null,
            },
          ];
        }

        return [
          siteId,
          {
            draft: value as NewSiteRegistrationDraft,
            updatedAt: null,
          },
        ];
      })
    );
  } catch {
    return {};
  }
}

async function writeOverridesFile(data: SiteOverrideEntryMap) {
  await fs.writeFile(overridesPath, JSON.stringify(data, null, 2), "utf8");
}

function draftToSiteConfig(draft: NewSiteRegistrationDraft): SiteConfig {
  return {
    siteId: draft.siteId,
    siteName: draft.siteName,
    regionType: draft.regionType,
    launch: draft.launch,
    preferredWind: draft.preferredWind,
    windThresholds: draft.windThresholds,
    thermalThresholds: draft.thermalThresholds,
    baseThresholdsM: draft.baseThresholdsM,
    launchWindows: draft.launchWindows,
    scoreAdjustments: draft.scoreAdjustments,
    riskProfile: draft.riskProfile,
  };
}

export async function getSiteRegistrationOverrides() {
  return readOverridesFile();
}

export async function saveSiteRegistrationOverride(
  draft: NewSiteRegistrationDraft
) {
  const current = await readOverridesFile();
  current[draft.siteId] = {
    draft,
    updatedAt: new Date().toISOString(),
  };
  await writeOverridesFile(current);

  return current[draft.siteId];
}

export async function resetSiteRegistrationOverride(siteId: string) {
  const current = await readOverridesFile();

  if (!current[siteId]) {
    return false;
  }

  delete current[siteId];
  await writeOverridesFile(current);
  return true;
}

export async function getRuntimeSiteConfigs() {
  const overrides = await readOverridesFile();

  return siteConfigs.map((site) => {
    const override = overrides[site.siteId];
    return override ? draftToSiteConfig(override.draft) : site;
  });
}

export async function getRuntimeSiteConfigById(siteId: string) {
  const sites = await getRuntimeSiteConfigs();
  return sites.find((site) => site.siteId === siteId) ?? null;
}

export async function getManageDraftForSite(siteId: string) {
  const overrides = await readOverridesFile();

  if (overrides[siteId]) {
    return overrides[siteId].draft;
  }

  const baseSite = siteConfigs.find((site) => site.siteId === siteId);
  return baseSite ? createDraftFromSiteConfig(baseSite) : null;
}

export async function getSiteOverrideMetadata(siteId: string) {
  const overrides = await readOverridesFile();
  return overrides[siteId] ?? null;
}

export async function getManageSiteList() {
  const overrides = await readOverridesFile();

  return siteConfigs.map<ManageSiteListItem>((site) => {
    const summary = siteSummaries.find((item) => item.siteId === site.siteId);
    const override = overrides[site.siteId];
    const draft = override?.draft;
    const launchLat = draft?.launch.lat ?? site.launch.lat;
    const launchLng = draft?.launch.lng ?? site.launch.lng;
    const siteName = draft?.siteName ?? site.siteName;
    const regionName = draft?.regionName ?? summary?.name ?? site.siteName;
    const launchName = draft?.launch.name ?? site.launch.name;
    const matchedCatalogSite = koreaLaunchSites.find((catalogSite) => {
      const normalizedSourceName = catalogSite.sourceName.replace(/\s+/g, "").toLowerCase();
      const normalizedSiteName = siteName.replace(/\s+/g, "").toLowerCase();
      const normalizedRegionName = regionName.replace(/\s+/g, "").toLowerCase();
      const normalizedLaunchName = launchName.replace(/\s+/g, "").toLowerCase();
      const latClose = Math.abs(catalogSite.lat - launchLat) < 0.08;
      const lngClose = Math.abs(catalogSite.lng - launchLng) < 0.08;

      return (
        normalizedSourceName.includes(normalizedSiteName) ||
        normalizedSourceName.includes(normalizedRegionName) ||
        normalizedSourceName.includes(normalizedLaunchName) ||
        (latClose && lngClose)
      );
    });

    return {
      siteId: site.siteId,
      siteName,
      regionName,
      tagline: draft?.tagline ?? summary?.tagline ?? `${site.siteName} 운영 설정`,
      launchName,
      launchLat,
      launchLng,
      launchElevationM: draft?.launch.elevationM ?? site.launch.elevationM,
      preferredWindDirections: Array.from(
        new Set([
          ...(draft?.preferredWind.best ?? site.preferredWind.best),
          ...(draft?.preferredWind.conditional ?? site.preferredWind.conditional),
        ])
      ),
      waypointFileName: draft?.waypointUpload.fileName ?? null,
      routeNotes: draft?.routeNotes ?? createDraftFromSiteConfig(site).routeNotes,
      sourceLinks: matchedCatalogSite
        ? filterWeatherLinks(matchedCatalogSite.sourceLinks)
        : [],
      hasOverride: Boolean(override),
      updatedAt: override?.updatedAt ?? null,
    };
  });
}
