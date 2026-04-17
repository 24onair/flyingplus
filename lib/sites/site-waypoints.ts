import { promises as fs } from "fs";
import path from "path";
import { getMungyeongWaypointDatabase } from "@/data/waypoints/mungyeong";
import { getManageDraftForSite } from "@/lib/sites/runtime-site-configs";
import type { WaypointCategory, WaypointRecord } from "@/types/course";

const supportedExtensions = new Set(["wpt", "cup", "gpx", "kml", "csv"]);

function classifyWaypoint(code: string, label: string): WaypointCategory {
  const upperCode = code.toUpperCase();
  const upperLabel = label.toUpperCase();

  if (
    upperCode.startsWith("-T-") ||
    upperLabel.includes("TAKEOFF") ||
    upperLabel.includes("RAMP") ||
    label.includes("이륙장")
  ) {
    return "launch";
  }

  if (
    upperCode.startsWith("-L-") ||
    upperCode.startsWith("-L2-") ||
    upperLabel.includes("LANDING") ||
    label.includes("착륙장")
  ) {
    return "landing";
  }

  if (
    upperLabel.includes("AIRPORT") ||
    upperLabel.includes("CC") ||
    upperLabel.includes("GOLF") ||
    label.includes("공항")
  ) {
    return "reference";
  }

  return "turnpoint";
}

function parsedJsonPath(siteId: string, fileName: string) {
  return path.join(
    process.cwd(),
    "data",
    "sites",
    "uploads",
    siteId,
    `${fileName}.parsed.json`
  );
}

function customWaypointPath(siteId: string) {
  return path.join(
    process.cwd(),
    "data",
    "sites",
    "uploads",
    siteId,
    "custom-waypoints.parsed.json"
  );
}

function rawWaypointPath(siteId: string, fileName: string) {
  return path.join(process.cwd(), "data", "sites", "uploads", siteId, fileName);
}

function parseOziWpt(text: string, siteId: string, source: string): WaypointRecord[] {
  const waypoints: Array<WaypointRecord | null> = text
    .split(/\r?\n/)
    .slice(4)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.split(",").map((part) => part.trim()))
    .filter((parts) => parts.length >= 15)
    .map((parts) => {
      const code = parts[1];
      const lat = Number(parts[2]);
      const lng = Number(parts[3]);
      const label = parts[10].replace(/^"+|"+$/g, "").trim() || code;
      const elevationM = Number(parts[14]);

      if (!code || Number.isNaN(lat) || Number.isNaN(lng)) {
        return null;
      }

      return {
        siteId,
        code,
        name: code,
        label,
        lat,
        lng,
        elevationM: Number.isFinite(elevationM) ? elevationM : 0,
        category: classifyWaypoint(code, label),
        source,
      } satisfies WaypointRecord;
    });

  return waypoints.filter((item): item is WaypointRecord => item !== null);
}

function parseKoreanWpt(text: string, siteId: string, source: string): WaypointRecord[] {
  const waypoints: Array<WaypointRecord | null> = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("W  "))
    .map((line) => line.replace(/[튞튓]/g, " "))
    .map((line) => {
      const match = line.match(
        /^W\s+(.*?)\s+A\s+([0-9.+-]+)\s+([0-9.+-]+)\s+\S+\s+\S+\s+([0-9.+-]+)\s+(.*)$/
      );

      if (!match) {
        return null;
      }

      const [, rawName, latRaw, lngRaw, elevationRaw, descriptionRaw] = match;
      const code = rawName.trim().slice(0, 16) || "WP";
      const label = rawName.trim();
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      const elevationM = Number(elevationRaw);
      const description = descriptionRaw.trim();

      if (!label || Number.isNaN(lat) || Number.isNaN(lng)) {
        return null;
      }

      return {
        siteId,
        code,
        name: code,
        label: description ? `${label} / ${description}` : label,
        lat,
        lng,
        elevationM: Number.isFinite(elevationM) ? elevationM : 0,
        category: classifyWaypoint(code, `${label} ${description}`),
        source,
      } satisfies WaypointRecord;
    });

  return waypoints.filter((item): item is WaypointRecord => item !== null);
}

export function parseWaypointFileContent(
  text: string,
  siteId: string,
  source: string
): WaypointRecord[] {
  if (text.startsWith("OziExplorer Waypoint File Version")) {
    return parseOziWpt(text, siteId, source);
  }

  if (text.startsWith("G  WGS 84") || text.includes("\nW  ")) {
    return parseKoreanWpt(text, siteId, source);
  }

  return [];
}

export async function persistParsedWaypointFile(siteId: string, fileName: string) {
  const sourcePath = rawWaypointPath(siteId, fileName);
  const source = await fs.readFile(sourcePath, "utf8");
  const parsed = parseWaypointFileContent(source, siteId, fileName);

  await fs.writeFile(
    parsedJsonPath(siteId, fileName),
    JSON.stringify(parsed, null, 2),
    "utf8"
  );

  return parsed;
}

async function readParsedWaypointFile(siteId: string, fileName: string) {
  try {
    const raw = await fs.readFile(parsedJsonPath(siteId, fileName), "utf8");
    const parsed = JSON.parse(raw) as WaypointRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readCustomWaypointFile(siteId: string) {
  try {
    const raw = await fs.readFile(customWaypointPath(siteId), "utf8");
    const parsed = JSON.parse(raw) as WaypointRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitizeWaypointCode(value: string) {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);

  return cleaned || "CUST-WP";
}

function ensureUniqueWaypointCode(existing: WaypointRecord[], preferred: string) {
  const baseCode = sanitizeWaypointCode(preferred);
  const existingCodes = new Set(existing.map((item) => item.code.toUpperCase()));

  if (!existingCodes.has(baseCode)) {
    return baseCode;
  }

  let sequence = 2;
  while (sequence < 1000) {
    const suffix = `-${sequence}`;
    const candidate = `${baseCode.slice(0, Math.max(1, 16 - suffix.length))}${suffix}`;
    if (!existingCodes.has(candidate.toUpperCase())) {
      return candidate;
    }
    sequence += 1;
  }

  return `${baseCode.slice(0, 12)}-${Date.now().toString().slice(-3)}`;
}

export async function appendCustomWaypoint(
  siteId: string,
  waypoint: {
    name: string;
    label?: string;
    lat: number;
    lng: number;
    elevationM: number;
    category: WaypointCategory;
  }
) {
  const existingDatabase = await getSiteWaypointDatabase(siteId);
  const existingCustom = await readCustomWaypointFile(siteId);
  const code = ensureUniqueWaypointCode(
    existingDatabase,
    waypoint.name || waypoint.label || "CUST-WP"
  );
  const record: WaypointRecord = {
    siteId,
    code,
    name: code,
    label: waypoint.label?.trim() || waypoint.name.trim() || code,
    lat: waypoint.lat,
    lng: waypoint.lng,
    elevationM: Number.isFinite(waypoint.elevationM) ? waypoint.elevationM : 0,
    category: waypoint.category,
    source: "custom-task",
  };

  await fs.mkdir(path.dirname(customWaypointPath(siteId)), { recursive: true });
  await fs.writeFile(
    customWaypointPath(siteId),
    JSON.stringify([...existingCustom, record], null, 2),
    "utf8"
  );

  return record;
}

async function getLatestUploadedWaypointFile(siteId: string) {
  try {
    const targetDir = path.join(process.cwd(), "data", "sites", "uploads", siteId);
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const extension = entry.name.split(".").pop()?.toLowerCase() ?? "";
          if (!supportedExtensions.has(extension)) {
            return null;
          }

          const filePath = path.join(targetDir, entry.name);
          const stats = await fs.stat(filePath);
          return {
            fileName: entry.name,
            mtimeMs: stats.mtimeMs,
          };
        })
    );

    return files
      .filter((item): item is { fileName: string; mtimeMs: number } => item !== null)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.fileName ?? null;
  } catch {
    return null;
  }
}

async function loadUploadedSiteWaypoints(siteId: string, fileName: string) {
  const cached = await readParsedWaypointFile(siteId, fileName);

  if (cached.length > 0) {
    return cached;
  }

  try {
    return await persistParsedWaypointFile(siteId, fileName);
  } catch {
    return [];
  }
}

export async function getSiteWaypointDatabase(siteId: string) {
  const draft = await getManageDraftForSite(siteId);
  const configuredFileName = draft?.waypointUpload.fileName?.trim() || null;
  const fallbackFileName = await getLatestUploadedWaypointFile(siteId);
  const fileCandidates = Array.from(
    new Set([configuredFileName, fallbackFileName].filter(Boolean))
  ) as string[];

  for (const fileName of fileCandidates) {
    const uploadedWaypoints = await loadUploadedSiteWaypoints(siteId, fileName);
    if (uploadedWaypoints.length > 0) {
      const customWaypoints = await readCustomWaypointFile(siteId);
      return [...uploadedWaypoints, ...customWaypoints];
    }
  }

  const customWaypoints = await readCustomWaypointFile(siteId);

  if (siteId === "mungyeong") {
    return [...getMungyeongWaypointDatabase(), ...customWaypoints];
  }

  return customWaypoints;
}
