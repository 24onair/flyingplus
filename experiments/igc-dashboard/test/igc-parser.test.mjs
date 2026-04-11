import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFlightSummary,
  parseBRecord,
  parseIgcText,
  parseLatLonCompact,
} from "../lib/igc-parser.mjs";

test("parseLatLonCompact parses IGC coordinates", () => {
  assert.equal(parseLatLonCompact("3643867N", "lat").toFixed(6), "36.731117");
  assert.equal(parseLatLonCompact("12810463E", "lon").toFixed(6), "128.174383");
});

test("parseBRecord parses fix line", () => {
  const fix = parseBRecord("B0543343643867N12810463EA0084000857");
  assert.equal(fix.time, "054334");
  assert.equal(fix.validity, "A");
  assert.equal(fix.pressureAltitudeM, 840);
  assert.equal(fix.gpsAltitudeM, 857);
});

test("parseIgcText parses header, task and fixes", () => {
  const igc = [
    "AXXX",
    "HFDTEDATE:290524,01",
    "HFPLTPILOTINCHARGE:sunghoon son",
    "HFGTYGLIDERTYPE:Ozone Swift 6",
    "HFFTYFRTYPE:Naviter,SeeYou Navigator",
    "HFTZNTIMEZONE:9.0",
    "C3643870N12810476ETAKEOFF- MUNGYEONG1",
    "C3643019N12810965EMT- DANSAN",
    "LXNAOZN=0,Style=1,R1=400.0m,A1=180.0,R2=0.0m,A2=0.0,SpeedStyle=0",
    "LXNAOZN=0,PntElev=921.0m,Lat=3643.019N,Lon=12810.965E",
    "B0543343643867N12810463EA0084000857",
    "LXNA::PHASE:takingOff",
    "B0543353643868N12810464EA0084100860",
  ].join("\n");

  const parsed = parseIgcText(igc);
  parsed.summary = buildFlightSummary(parsed);

  assert.equal(parsed.header.pilot, "sunghoon son");
  assert.equal(parsed.header.glider, "Ozone Swift 6");
  assert.equal(parsed.header.date, "2024-05-29");
  assert.equal(parsed.task.length, 2);
  assert.equal(parsed.task[0].name, "TAKEOFF- MUNGYEONG1");
  assert.equal(parsed.task[0].radiusM, 400);
  assert.equal(parsed.task[0].elevationM, 921);
  assert.equal(parsed.task[1].elevationM, null);
  assert.equal(parsed.fixes.length, 2);
  assert.equal(parsed.phaseEvents.length, 1);
  assert.equal(parsed.summary.fixCount, 2);
});
