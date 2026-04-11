#!/usr/bin/env node

import path from "node:path";
import { parseIgcFile } from "../lib/igc-parser.mjs";

const filePath = process.argv[2];

if (!filePath) {
  console.error(
    "Usage: node experiments/igc-dashboard/scripts/analyze-igc.mjs \"/absolute/path/to/file.igc\"",
  );
  process.exit(1);
}

const parsed = parseIgcFile(filePath);

const payload = {
  filePath: path.resolve(filePath),
  summary: parsed.summary,
  task: parsed.task,
  phaseEvents: parsed.phaseEvents.slice(0, 20),
};

console.log(JSON.stringify(payload, null, 2));
