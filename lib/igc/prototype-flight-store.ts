import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { buildFlightSummary, parseIgcText } from "@/lib/igc/shared-parser.mjs";

export type IgcFlightListItem = {
  id: string;
  title: string;
  sourceFileName: string;
  pilot: string | null;
  glider: string | null;
  flightDate: string | null;
  uploadedAt: string;
  distanceKm: number | null;
  durationSeconds: number | null;
  fixCount: number;
};

export type IgcFlightPayload = {
  id: string;
  title: string;
  sourceFileName: string;
  uploadedAt: string;
  header: Record<string, unknown>;
  summary: Record<string, unknown>;
  task: unknown[];
  phaseEvents: unknown[];
  fixes: unknown[];
};

const ROOT_DIR = path.join(process.cwd(), "data", "igc-flights");
const FLIGHTS_DIR = path.join(ROOT_DIR, "flights");
const MANIFEST_FILE = path.join(ROOT_DIR, "index.json");

async function ensureStore() {
  await fs.mkdir(FLIGHTS_DIR, { recursive: true });
}

async function readManifest(): Promise<IgcFlightListItem[]> {
  try {
    const raw = await fs.readFile(MANIFEST_FILE, "utf8");
    const parsed = JSON.parse(raw) as IgcFlightListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeManifest(items: IgcFlightListItem[]) {
  await ensureStore();
  await fs.writeFile(MANIFEST_FILE, JSON.stringify(items, null, 2), "utf8");
}

function buildFlightTitle(parsed: ReturnType<typeof parseIgcText>, _sourceFileName: string) {
  const date = parsed.header.date ?? "undated";
  const pilot = parsed.header.pilot?.trim() || "unknown-pilot";
  return `${date} ${pilot}`;
}

export async function listPrototypeFlights() {
  const items = await readManifest();
  return items.sort((a, b) => {
    const dateCompare = (b.flightDate ?? "").localeCompare(a.flightDate ?? "");
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return b.uploadedAt.localeCompare(a.uploadedAt);
  });
}

export async function getPrototypeFlight(flightId: string) {
  const filePath = path.join(FLIGHTS_DIR, `${flightId}.json`);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as IgcFlightPayload;
}

export async function savePrototypeFlight(input: {
  sourceFileName: string;
  igcText: string;
}) {
  await ensureStore();

  const parsed = parseIgcText(input.igcText);
  parsed.summary = buildFlightSummary(parsed);

  const uploadedAt = new Date().toISOString();
  const id = randomUUID();
  const title = buildFlightTitle(parsed, input.sourceFileName);

  const payload: IgcFlightPayload = {
    id,
    title,
    sourceFileName: input.sourceFileName,
    uploadedAt,
    header: parsed.header,
    summary: parsed.summary,
    task: parsed.task,
    phaseEvents: parsed.phaseEvents,
    fixes: parsed.fixes,
  };

  const listItem: IgcFlightListItem = {
    id,
    title,
    sourceFileName: input.sourceFileName,
    pilot: parsed.header.pilot,
    glider: parsed.header.glider,
    flightDate: parsed.header.date,
    uploadedAt,
    distanceKm: typeof parsed.summary.distanceKm === "number" ? parsed.summary.distanceKm : null,
    durationSeconds:
      typeof parsed.summary.durationSeconds === "number"
        ? parsed.summary.durationSeconds
        : null,
    fixCount: typeof parsed.summary.fixCount === "number" ? parsed.summary.fixCount : 0,
  };

  await fs.writeFile(
    path.join(FLIGHTS_DIR, `${id}.json`),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
  await fs.writeFile(path.join(FLIGHTS_DIR, `${id}.igc`), input.igcText, "utf8");

  const items = await readManifest();
  items.push(listItem);
  await writeManifest(items);

  return listItem;
}
