import fs from "node:fs";

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function parseIgcDate(raw) {
  if (!raw || raw.length !== 6) {
    return null;
  }

  const day = Number(raw.slice(0, 2));
  const month = Number(raw.slice(2, 4));
  const year = 2000 + Number(raw.slice(4, 6));

  if (!day || !month) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseLatLonCompact(value, axis) {
  if (!value) {
    return null;
  }

  const isLat = axis === "lat";
  const degreeLength = isLat ? 2 : 3;
  const minLength = 5;
  const expectedLength = degreeLength + minLength + 1;

  if (value.length !== expectedLength) {
    return null;
  }

  const hemisphere = value.slice(-1);
  const degrees = Number(value.slice(0, degreeLength));
  const minuteScaled = Number(value.slice(degreeLength, degreeLength + minLength));

  if (Number.isNaN(degrees) || Number.isNaN(minuteScaled)) {
    return null;
  }

  const minutes = minuteScaled / 1000;
  let decimal = degrees + minutes / 60;

  if (hemisphere === "S" || hemisphere === "W") {
    decimal *= -1;
  }

  return decimal;
}

export function parseLatLonSeparated(raw) {
  const match =
    raw.match(/Lat=(\d{4}\.\d{3}[NS]),Lon=(\d{5}\.\d{3}[EW])/i) ||
    raw.match(/Lat=(\d{4}\.\d{3}[NS]).*Lon=(\d{5}\.\d{3}[EW])/i);

  if (!match) {
    return { lat: null, lon: null };
  }

  return {
    lat: parseDecimalMinuteCoordinate(match[1], "lat"),
    lon: parseDecimalMinuteCoordinate(match[2], "lon"),
  };
}

export function parseDecimalMinuteCoordinate(value, axis) {
  const isLat = axis === "lat";
  const degreeLength = isLat ? 2 : 3;
  const hemisphere = value.slice(-1);
  const numeric = value.slice(0, -1);
  const splitIndex = numeric.indexOf(".");

  if (splitIndex === -1) {
    return null;
  }

  const whole = numeric.slice(0, splitIndex);
  const frac = numeric.slice(splitIndex + 1);

  const degrees = Number(whole.slice(0, degreeLength));
  const minutes = Number(`${whole.slice(degreeLength)}.${frac}`);

  if (Number.isNaN(degrees) || Number.isNaN(minutes)) {
    return null;
  }

  let decimal = degrees + minutes / 60;
  if (hemisphere === "S" || hemisphere === "W") {
    decimal *= -1;
  }
  return decimal;
}

export function parseBRecord(line) {
  if (!line.startsWith("B") || line.length < 35) {
    return null;
  }

  const time = line.slice(1, 7);
  const latRaw = line.slice(7, 15);
  const lonRaw = line.slice(15, 24);
  const validity = line.slice(24, 25);
  const pressureAltitude = Number(line.slice(25, 30));
  const gpsAltitude = Number(line.slice(30, 35));

  return {
    type: "fix",
    time,
    lat: parseLatLonCompact(latRaw, "lat"),
    lon: parseLatLonCompact(lonRaw, "lon"),
    validity,
    pressureAltitudeM: Number.isNaN(pressureAltitude) ? null : pressureAltitude,
    gpsAltitudeM: Number.isNaN(gpsAltitude) ? null : gpsAltitude,
  };
}

export function parseCRecord(line) {
  if (!line.startsWith("C")) {
    return null;
  }

  const coordinateMatch = line.match(/^C(\d{7}[NS])(\d{8}[EW])(.*)$/);
  if (!coordinateMatch) {
    return null;
  }

  return {
    type: "task-point",
    lat: parseLatLonCompact(coordinateMatch[1], "lat"),
    lon: parseLatLonCompact(coordinateMatch[2], "lon"),
    name: coordinateMatch[3].trim() || null,
  };
}

export function parseLxnaOzn(line) {
  if (!line.startsWith("LXNAOZN=")) {
    return null;
  }

  const [indexPart, ...rest] = line.slice("LXNAOZN=".length).split(",");
  const pointIndex = Number(indexPart);
  const payload = rest.join(",");

  const radiusMatch = payload.match(/R1=([\d.]+)m/);
  const elevMatch = payload.match(/PntElev=([\d.]+)m/);
  const { lat, lon } = parseLatLonSeparated(payload);

  const result = {
    pointIndex: Number.isNaN(pointIndex) ? null : pointIndex,
  };

  if (radiusMatch) {
    result.radiusM = Number(radiusMatch[1]);
  }

  if (elevMatch) {
    result.elevationM = Number(elevMatch[1]);
  }

  if (typeof lat === "number") {
    result.lat = lat;
  }

  if (typeof lon === "number") {
    result.lon = lon;
  }

  return result;
}

export function parseTimeToSeconds(value) {
  if (!value || value.length !== 6) {
    return null;
  }

  const hh = Number(value.slice(0, 2));
  const mm = Number(value.slice(2, 4));
  const ss = Number(value.slice(4, 6));

  if ([hh, mm, ss].some(Number.isNaN)) {
    return null;
  }

  return hh * 3600 + mm * 60 + ss;
}

export function haversineDistanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        sinLat * sinLat +
          Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon,
      ),
      Math.sqrt(
        1 -
          (sinLat * sinLat +
            Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon),
      ),
    );

  return earthRadiusKm * c;
}

export function buildFlightSummary(parsed) {
  const fixes = parsed.fixes.filter(
    (fix) => typeof fix.lat === "number" && typeof fix.lon === "number",
  );

  const startFix = fixes[0] ?? null;
  const endFix = fixes[fixes.length - 1] ?? null;

  let distanceKm = 0;
  for (let index = 1; index < fixes.length; index += 1) {
    distanceKm += haversineDistanceKm(fixes[index - 1], fixes[index]);
  }

  const gpsAltitudes = fixes
    .map((fix) => fix.gpsAltitudeM)
    .filter((value) => typeof value === "number");

  const pressureAltitudes = fixes
    .map((fix) => fix.pressureAltitudeM)
    .filter((value) => typeof value === "number");

  const startSeconds = startFix ? parseTimeToSeconds(startFix.time) : null;
  const endSeconds = endFix ? parseTimeToSeconds(endFix.time) : null;

  return {
    pilot: parsed.header.pilot ?? null,
    glider: parsed.header.glider ?? null,
    recorder: parsed.header.recorder ?? null,
    date: parsed.header.date ?? null,
    timezone: parsed.header.timezone ?? null,
    fixCount: fixes.length,
    taskCount: parsed.task.length,
    phaseEventCount: parsed.phaseEvents.length,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationSeconds:
      typeof startSeconds === "number" && typeof endSeconds === "number"
        ? Math.max(0, endSeconds - startSeconds)
        : null,
    gpsAltitudeMinM: gpsAltitudes.length ? Math.min(...gpsAltitudes) : null,
    gpsAltitudeMaxM: gpsAltitudes.length ? Math.max(...gpsAltitudes) : null,
    pressureAltitudeMinM: pressureAltitudes.length
      ? Math.min(...pressureAltitudes)
      : null,
    pressureAltitudeMaxM: pressureAltitudes.length
      ? Math.max(...pressureAltitudes)
      : null,
    takeoff: startFix
      ? {
          time: startFix.time,
          lat: startFix.lat,
          lon: startFix.lon,
          gpsAltitudeM: startFix.gpsAltitudeM,
        }
      : null,
    landing: endFix
      ? {
          time: endFix.time,
          lat: endFix.lat,
          lon: endFix.lon,
          gpsAltitudeM: endFix.gpsAltitudeM,
        }
      : null,
  };
}

export function parseIgcText(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);

  const header = {
    pilot: null,
    glider: null,
    recorder: null,
    date: null,
    timezone: null,
  };
  const fixes = [];
  const task = [];
  const phaseEvents = [];
  const extra = {
    taskMetadata: [],
    observationZones: new Map(),
  };

  let lastFixTime = null;

  for (const line of lines) {
    if (line.startsWith("HFDTEDATE:")) {
      header.date = parseIgcDate(line.slice("HFDTEDATE:".length, "HFDTEDATE:".length + 6));
      continue;
    }

    if (line.startsWith("HFPLTPILOTINCHARGE:")) {
      header.pilot = line.slice("HFPLTPILOTINCHARGE:".length).trim() || null;
      continue;
    }

    if (line.startsWith("HFGTYGLIDERTYPE:")) {
      header.glider = line.slice("HFGTYGLIDERTYPE:".length).trim() || null;
      continue;
    }

    if (line.startsWith("HFFTYFRTYPE:")) {
      header.recorder = line.slice("HFFTYFRTYPE:".length).trim() || null;
      continue;
    }

    if (line.startsWith("HFTZNTIMEZONE:")) {
      header.timezone = line.slice("HFTZNTIMEZONE:".length).trim() || null;
      continue;
    }

    if (line.startsWith("B")) {
      const fix = parseBRecord(line);
      if (fix) {
        fixes.push(fix);
        lastFixTime = fix.time;
      }
      continue;
    }

    if (line.startsWith("C")) {
      const taskPoint = parseCRecord(line);
      if (taskPoint && !(taskPoint.lat === 0 && taskPoint.lon === 0)) {
        task.push(taskPoint);
      }
      continue;
    }

    if (line.startsWith("LXNA::PHASE:")) {
      phaseEvents.push({
        phase: line.slice("LXNA::PHASE:".length).trim(),
        time: lastFixTime,
      });
      continue;
    }

    if (line.startsWith("LXNAOZN=")) {
      const zone = parseLxnaOzn(line);
      if (zone?.pointIndex !== null) {
        const previous = extra.observationZones.get(zone.pointIndex) ?? {};
        extra.observationZones.set(zone.pointIndex, {
          ...previous,
          ...zone,
        });
      }
      continue;
    }

    if (line.startsWith("LXNATSK")) {
      extra.taskMetadata.push(line);
    }
  }

  const orderedZones = [...extra.observationZones.entries()]
    .sort((a, b) => a[0] - b[0])
    .map((entry) => entry[1]);

  const taskWithZones = task.map((point, index) => {
    const zone = orderedZones[index] ?? extra.observationZones.get(index) ?? null;
    return {
      ...point,
      radiusM: zone?.radiusM ?? null,
      elevationM: zone?.elevationM ?? null,
      zoneLat: zone?.lat ?? null,
      zoneLon: zone?.lon ?? null,
    };
  });

  return {
    header,
    fixes,
    task: taskWithZones,
    phaseEvents,
    taskMetadata: extra.taskMetadata,
    summary: null,
  };
}

export function parseIgcFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const parsed = parseIgcText(text);
  parsed.summary = buildFlightSummary(parsed);
  return parsed;
}
