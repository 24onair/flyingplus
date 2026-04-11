#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { parseIgcFile } from "../lib/igc-parser.mjs";

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error(
    "Usage: node experiments/igc-dashboard/scripts/export-igc-json.mjs \"/absolute/input.igc\" \"public/experiments/igc-dashboard/sample-flight.json\"",
  );
  process.exit(1);
}

const parsed = parseIgcFile(inputPath);

const payload = {
  sourceFileName: path.basename(inputPath),
  generatedAt: new Date().toISOString(),
  summary: parsed.summary,
  header: parsed.header,
  task: parsed.task,
  phaseEvents: parsed.phaseEvents,
  fixes: parsed.fixes,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));

console.log(`Wrote ${outputPath}`);
