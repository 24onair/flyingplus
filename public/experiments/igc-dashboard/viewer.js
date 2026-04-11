const statusPanel = document.getElementById("status-panel");
const metricsGrid = document.getElementById("metrics-grid");
const contentGrid = document.getElementById("content-grid");
const statsGrid = document.getElementById("stats-grid");
const anomalyGrid = document.getElementById("anomaly-grid");
const listsGrid = document.getElementById("lists-grid");
const taskList = document.getElementById("task-list");
const phaseList = document.getElementById("phase-list");
const altitudeSvg = document.getElementById("altitude-svg");
const altitudeFooterTime = document.getElementById("altitude-footer-time");
const altitudeFooterAltitude = document.getElementById("altitude-footer-altitude");
const altitudeFooterDelta = document.getElementById("altitude-footer-delta");
const altitudeFooterSegment = document.getElementById("altitude-footer-segment");
const flightStats = document.getElementById("flight-stats");
const segmentStats = document.getElementById("segment-stats");
const anomalyStats = document.getElementById("anomaly-stats");
const anomalyList = document.getElementById("anomaly-list");
const modeGrid = document.getElementById("mode-grid");
const modeStats = document.getElementById("mode-stats");
const modeList = document.getElementById("mode-list");
const playbackToggle = document.getElementById("playback-toggle");
const playbackRange = document.getElementById("playback-range");
const playbackTime = document.getElementById("playback-time");
const playbackMeta = document.getElementById("playback-meta");
const speedToolbar = document.getElementById("speed-toolbar");
const mapStyleToolbar = document.getElementById("map-style-toolbar");
const detailBackLink = document.getElementById("detail-back-link");

let trackMap = null;
let trackLayer = null;
let taskLayer = null;
let playbackLayer = null;
let modeLayer = null;
let playbackMarker = null;
let playbackAnimationId = null;
let baseTileLayer = null;
let playbackState = {
  fixes: [],
  segments: [],
  currentIndex: 0,
  playing: false,
  speedMultiplier: 1,
  startTimeSeconds: null,
  mapStyle: "basic",
};

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatSeconds(seconds) {
  if (typeof seconds !== "number") {
    return "-";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  return `${hours}h ${minutes}m ${remain}s`;
}

function formatElapsedSeconds(seconds) {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds < 0) {
    return "--:--:--";
  }

  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = Math.floor(seconds % 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function formatClock(timeString) {
  if (!timeString || timeString.length !== 6) {
    return "--:--:--";
  }

  return `${timeString.slice(0, 2)}:${timeString.slice(2, 4)}:${timeString.slice(4, 6)}`;
}

function formatSignedMeters(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}m`;
}

function createTileLayer(style) {
  if (style === "terrain") {
    return window.L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 17,
        attribution:
          'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      },
    );
  }

  return window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  });
}

function applyMapStyle(style) {
  playbackState.mapStyle = style;

  if (trackMap) {
    if (baseTileLayer) {
      baseTileLayer.remove();
    }
    baseTileLayer = createTileLayer(style).addTo(trackMap);
  }

  mapStyleToolbar?.querySelectorAll("[data-map-style]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mapStyle === style);
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

function haversineDistanceKm(a, b) {
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
        sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon,
      ),
      Math.sqrt(
        1 - (sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon),
      ),
    );

  return earthRadiusKm * c;
}

function parseTimeToSeconds(value) {
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

function renderMetrics(summary, sourceFileName) {
  const metrics = [
    ["파일", sourceFileName, summary.date ?? ""],
    ["조종사", summary.pilot ?? "-", summary.glider ?? "-"],
    ["비행 시간", formatSeconds(summary.durationSeconds), summary.recorder ?? "-"],
    ["계산 거리", `${formatNumber(summary.distanceKm, 2)} km`, `${summary.fixCount} fixes`],
    ["GPS 고도", `${formatNumber(summary.gpsAltitudeMinM)}m - ${formatNumber(summary.gpsAltitudeMaxM)}m`, "최저 / 최고"],
    ["선언 Task", `${summary.taskCount} points`, `${summary.phaseEventCount} phase events`],
  ];

  metricsGrid.innerHTML = "";
  for (const [label, value, sub] of metrics) {
    const card = el("article", "panel metric-card");
    card.append(el("p", "metric-label", label));
    card.append(el("p", "metric-value", value));
    card.append(el("p", "metric-sub", sub));
    metricsGrid.append(card);
  }
}

function renderTask(task) {
  taskList.innerHTML = "";
  if (!task.length) {
    taskList.append(el("div", "empty", "선언된 task point가 없습니다."));
    return;
  }

  task.forEach((point, index) => {
    const card = el("article", "list-card");
    card.append(el("h3", "", `${index + 1}. ${point.name ?? "Unnamed Point"}`));
    card.append(
      el(
        "p",
        "list-meta",
        `좌표 ${point.lat?.toFixed(5)}, ${point.lon?.toFixed(5)} | 반경 ${point.radiusM ?? "-"}m | 고도 ${point.elevationM ?? "-"}m`,
      ),
    );
    taskList.append(card);
  });
}

function renderPhases(phaseEvents) {
  phaseList.innerHTML = "";
  if (!phaseEvents.length) {
    phaseList.append(el("div", "empty", "phase 이벤트가 없습니다."));
    return;
  }

  phaseEvents.forEach((item, index) => {
    const card = el("article", "list-card");
    card.append(el("h3", "", `${index + 1}. ${item.phase}`));
    card.append(el("p", "list-meta", `시각 ${item.time ?? "-"}`));
    phaseList.append(card);
  });
}

function renderMap(fixes, task) {
  const points = fixes.filter(
    (fix) => typeof fix.lat === "number" && typeof fix.lon === "number",
  );

  if (!points.length || typeof window.L === "undefined") {
    return;
  }

  if (!trackMap) {
    trackMap = window.L.map("track-map", {
      zoomControl: true,
      attributionControl: true,
    });
    applyMapStyle(playbackState.mapStyle);
  }

  if (trackLayer) {
    trackLayer.remove();
  }

  if (taskLayer) {
    taskLayer.remove();
  }
  if (modeLayer) {
    modeLayer.remove();
  }

  trackLayer = window.L.layerGroup().addTo(trackMap);
  taskLayer = window.L.layerGroup().addTo(trackMap);
  modeLayer = window.L.layerGroup().addTo(trackMap);
  playbackLayer = window.L.layerGroup().addTo(trackMap);

  const latLngs = points.map((point) => [point.lat, point.lon]);
  window.L.polyline(latLngs, {
    color: "#167a71",
    weight: 3,
    opacity: 0.95,
  }).addTo(trackLayer);

  const start = latLngs[0];
  const end = latLngs[latLngs.length - 1];
  window.L.circleMarker(start, {
    radius: 7,
    color: "#167a71",
    fillColor: "#167a71",
    fillOpacity: 1,
    weight: 2,
  })
    .bindPopup("START")
    .addTo(trackLayer);

  window.L.circleMarker(end, {
    radius: 7,
    color: "#cf5f3d",
    fillColor: "#cf5f3d",
    fillOpacity: 1,
    weight: 2,
  })
    .bindPopup("END")
    .addTo(trackLayer);

  task.forEach((point, index) => {
    if (typeof point.lat !== "number" || typeof point.lon !== "number") {
      return;
    }

    const latLng = [point.lat, point.lon];
    window.L.circleMarker(latLng, {
      radius: 5,
      color: "#305cf0",
      fillColor: "#305cf0",
      fillOpacity: 0.95,
      weight: 2,
    })
      .bindPopup(`${index + 1}. ${point.name ?? "Task Point"}`)
      .addTo(taskLayer);

    if (typeof point.radiusM === "number") {
      window.L.circle(latLng, {
        radius: point.radiusM,
        color: "#305cf0",
        weight: 1.5,
        opacity: 0.5,
        fillOpacity: 0.04,
      }).addTo(taskLayer);
    }
  });

  trackMap.fitBounds(window.L.latLngBounds(latLngs), {
    padding: [24, 24],
  });
}

function renderAltitude(fixes, currentIndex = null) {
  const width = 800;
  const height = 300;
  const padding = 30;
  const points = fixes
    .map((fix, index) => ({
      x: index,
      y: fix.gpsAltitudeM,
    }))
    .filter((fix) => typeof fix.y === "number");

  if (!points.length) {
    altitudeSvg.innerHTML = "";
    return;
  }

  const minAlt = Math.min(...points.map((p) => p.y));
  const maxAlt = Math.max(...points.map((p) => p.y));
  const altSpan = Math.max(maxAlt - minAlt, 1);
  const indexSpan = Math.max(points.length - 1, 1);

  const linePath = points
    .map((point, index) => {
      const x = padding + (point.x / indexSpan) * (width - padding * 2);
      const y = height - padding - ((point.y - minAlt) / altSpan) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  let focusMarkup = "";
  if (typeof currentIndex === "number" && currentIndex >= 0 && currentIndex < points.length) {
    const current = points[currentIndex];
    const x = padding + (current.x / indexSpan) * (width - padding * 2);
    const y = height - padding - ((current.y - minAlt) / altSpan) * (height - padding * 2);
    focusMarkup = `
      <line x1="${x}" y1="${padding}" x2="${x}" y2="${height - padding}" stroke="#cf5f3d" stroke-width="1.5" stroke-dasharray="4 4"></line>
      <circle cx="${x}" cy="${y}" r="6" fill="#cf5f3d"></circle>
    `;
  }

  altitudeSvg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" rx="24" fill="rgba(22,122,113,0.05)"></rect>
    <path d="${areaPath}" fill="rgba(22,122,113,0.16)"></path>
    <path d="${linePath}" fill="none" stroke="#167a71" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
    ${focusMarkup}
    <text x="${padding}" y="${padding}" fill="#6a6458" font-size="14">최고 ${Math.round(maxAlt)}m</text>
    <text x="${padding}" y="${height - 12}" fill="#6a6458" font-size="14">최저 ${Math.round(minAlt)}m</text>
  `;
}

function renderAltitudeFooter(fixes, currentIndex) {
  const current = fixes[currentIndex] ?? null;
  const previous = currentIndex > 0 ? fixes[currentIndex - 1] : null;
  const currentTimeSeconds = current ? parseTimeToSeconds(current.time) : null;

  altitudeFooterTime.textContent =
    currentTimeSeconds !== null && playbackState.startTimeSeconds !== null
      ? formatElapsedSeconds(currentTimeSeconds - playbackState.startTimeSeconds)
      : "--:--:--";
  altitudeFooterAltitude.textContent =
    current && typeof current.gpsAltitudeM === "number"
      ? `${Math.round(current.gpsAltitudeM)}m`
      : "-m";

  if (
    current &&
    previous &&
    typeof current.gpsAltitudeM === "number" &&
    typeof previous.gpsAltitudeM === "number"
  ) {
    altitudeFooterDelta.textContent = formatSignedMeters(
      current.gpsAltitudeM - previous.gpsAltitudeM,
    );

    const segmentMin = Math.min(current.gpsAltitudeM, previous.gpsAltitudeM);
    const segmentMax = Math.max(current.gpsAltitudeM, previous.gpsAltitudeM);
    altitudeFooterSegment.textContent = `${Math.round(segmentMin)}m - ${Math.round(segmentMax)}m`;
    return;
  }

  altitudeFooterDelta.textContent = "-";
  altitudeFooterSegment.textContent = "-";
}

function analyzeFixSegments(fixes) {
  const points = fixes.filter(
    (fix) =>
      typeof fix.lat === "number" &&
      typeof fix.lon === "number" &&
      typeof fix.gpsAltitudeM === "number",
  );

  const segments = [];

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const next = points[index];
    const prevSec = parseTimeToSeconds(prev.time);
    const nextSec = parseTimeToSeconds(next.time);

    if (prevSec === null || nextSec === null || nextSec <= prevSec) {
      continue;
    }

    const deltaSeconds = nextSec - prevSec;
    const distanceKm = haversineDistanceKm(prev, next);
    const speedKmh = (distanceKm / deltaSeconds) * 3600;
    const climbMs = (next.gpsAltitudeM - prev.gpsAltitudeM) / deltaSeconds;

    segments.push({
      from: prev,
      to: next,
      index,
      deltaSeconds,
      distanceKm,
      speedKmh,
      climbMs,
      suspicious:
        speedKmh > 95 ||
        (deltaSeconds <= 3 && speedKmh > 75) ||
        Math.abs(climbMs) > 18,
    });
  }

  return segments;
}

function computeFlightStats(fixes) {
  const segments = analyzeFixSegments(fixes);

  let maxSpeedKmh = 0;
  let cleanMaxSpeedKmh = 0;
  let movingDistanceKm = 0;
  let movingTimeSeconds = 0;
  let maxClimbMs = Number.NEGATIVE_INFINITY;
  let minSinkMs = Number.POSITIVE_INFINITY;
  let suspiciousCount = 0;

  for (const segment of segments) {
    maxSpeedKmh = Math.max(maxSpeedKmh, segment.speedKmh);
    maxClimbMs = Math.max(maxClimbMs, segment.climbMs);
    minSinkMs = Math.min(minSinkMs, segment.climbMs);

    if (!segment.suspicious) {
      cleanMaxSpeedKmh = Math.max(cleanMaxSpeedKmh, segment.speedKmh);
    } else {
      suspiciousCount += 1;
    }

    if (segment.speedKmh > 5) {
      movingDistanceKm += segment.distanceKm;
      movingTimeSeconds += segment.deltaSeconds;
    }
  }

  return {
    segments,
    maxSpeedKmh,
    cleanMaxSpeedKmh,
    avgMovingSpeedKmh:
      movingTimeSeconds > 0 ? (movingDistanceKm / movingTimeSeconds) * 3600 : 0,
    maxClimbMs: Number.isFinite(maxClimbMs) ? maxClimbMs : 0,
    maxSinkMs: Number.isFinite(minSinkMs) ? minSinkMs : 0,
    suspiciousCount,
  };
}

function classifySegment(segment) {
  if (segment.climbMs >= 0.7 && segment.speedKmh <= 42) {
    return "thermal";
  }

  if (segment.climbMs <= 0.2 && segment.speedKmh >= 22) {
    return "glide";
  }

  return "transition";
}

function analyzeFlightModes(fixes, stats) {
  const validFixes = fixes.filter(
    (fix) =>
      typeof fix.lat === "number" &&
      typeof fix.lon === "number" &&
      typeof fix.gpsAltitudeM === "number",
  );

  const grouped = [];
  let current = null;

  for (const segment of stats.segments) {
    const mode = classifySegment(segment);

    if (!current || current.mode !== mode || segment.suspicious) {
      if (current) {
        grouped.push(current);
      }

      current = {
        mode,
        startIndex: Math.max(0, segment.index - 1),
        endIndex: segment.index,
        startTime: segment.from.time,
        endTime: segment.to.time,
        startAltitudeM: segment.from.gpsAltitudeM,
        endAltitudeM: segment.to.gpsAltitudeM,
        distanceKm: segment.distanceKm,
        durationSeconds: segment.deltaSeconds,
        avgSpeedKmh: segment.speedKmh,
        avgClimbMs: segment.climbMs,
      };
      continue;
    }

    current.endIndex = segment.index;
    current.endTime = segment.to.time;
    current.endAltitudeM = segment.to.gpsAltitudeM;
    current.distanceKm += segment.distanceKm;
    current.durationSeconds += segment.deltaSeconds;
    current.avgSpeedKmh += segment.speedKmh;
    current.avgClimbMs += segment.climbMs;
  }

  if (current) {
    grouped.push(current);
  }

  const analyzed = grouped
    .map((group) => {
      const segmentCount = Math.max(1, group.endIndex - group.startIndex);
      const slice = validFixes.slice(group.startIndex, group.endIndex + 1);
      return {
        ...group,
        points: slice,
        avgSpeedKmh: group.avgSpeedKmh / segmentCount,
        avgClimbMs: group.avgClimbMs / segmentCount,
        altitudeDeltaM:
          typeof group.startAltitudeM === "number" &&
          typeof group.endAltitudeM === "number"
            ? group.endAltitudeM - group.startAltitudeM
            : null,
      };
    })
    .filter((group) => {
      if (group.mode === "thermal") {
        return group.durationSeconds >= 18;
      }
      if (group.mode === "glide") {
        return group.durationSeconds >= 25;
      }
      return group.durationSeconds >= 15;
    });

  const thermals = analyzed.filter((group) => group.mode === "thermal");
  const glides = analyzed.filter((group) => group.mode === "glide");

  return {
    groups: analyzed,
    thermals,
    glides,
    totalThermalSeconds: thermals.reduce((sum, item) => sum + item.durationSeconds, 0),
    totalGlideSeconds: glides.reduce((sum, item) => sum + item.durationSeconds, 0),
  };
}

function renderModeOverlay(modeAnalysis) {
  if (!modeLayer || typeof window.L === "undefined") {
    return;
  }

  modeLayer.clearLayers();

  const colors = {
    thermal: "#0c8b65",
    glide: "#305cf0",
    transition: "#c97628",
  };

  modeAnalysis.groups.forEach((group) => {
    const latLngs = group.points
      .filter((point) => typeof point.lat === "number" && typeof point.lon === "number")
      .map((point) => [point.lat, point.lon]);

    if (latLngs.length < 2) {
      return;
    }

    window.L.polyline(latLngs, {
      color: colors[group.mode],
      weight: group.mode === "thermal" ? 5 : 4,
      opacity: 0.9,
    })
      .bindPopup(
        `${group.mode.toUpperCase()} | ${formatClock(group.startTime)} - ${formatClock(group.endTime)} | ${formatElapsedSeconds(group.durationSeconds)}`,
      )
      .addTo(modeLayer);
  });
}

function renderModeStats(modeAnalysis) {
  modeStats.innerHTML = "";
  const grid = el("div", "stat-grid");
  const items = [
    ["Thermal 수", `${formatNumber(modeAnalysis.thermals.length)}개`, ""],
    ["Glide 수", `${formatNumber(modeAnalysis.glides.length)}개`, ""],
    ["총 Thermal 시간", formatElapsedSeconds(modeAnalysis.totalThermalSeconds), ""],
    ["총 Glide 시간", formatElapsedSeconds(modeAnalysis.totalGlideSeconds), ""],
  ];

  items.forEach(([label, value]) => {
    const card = el("article", "stat-pill");
    card.append(el("h3", "", label));
    card.append(el("p", "", value));
    grid.append(card);
  });

  modeStats.append(grid);
}

function renderModeList(modeAnalysis) {
  modeList.innerHTML = "";

  if (!modeAnalysis.groups.length) {
    modeList.append(el("div", "empty", "자동 분석된 thermal / glide 구간이 없습니다."));
    return;
  }

  modeAnalysis.groups.forEach((group, index) => {
    const card = el("article", `mode-card ${group.mode}`);
    card.append(
      el(
        "h3",
        "",
        `${index + 1}. ${group.mode.toUpperCase()} | ${formatClock(group.startTime)} - ${formatClock(group.endTime)}`,
      ),
    );
    card.append(
      el(
        "p",
        "",
        `지속 ${formatElapsedSeconds(group.durationSeconds)} | 거리 ${formatNumber(group.distanceKm, 2)}km | 평균 속도 ${formatNumber(group.avgSpeedKmh, 1)}km/h | 평균 상승률 ${formatNumber(group.avgClimbMs, 1)}m/s | 고도 변화 ${group.altitudeDeltaM === null ? "-" : formatSignedMeters(group.altitudeDeltaM)}`,
      ),
    );
    modeList.append(card);
  });
}

function computeSegmentStats(task) {
  const validTask = task.filter(
    (point) => typeof point.lat === "number" && typeof point.lon === "number",
  );

  const segments = [];
  for (let index = 1; index < validTask.length; index += 1) {
    const from = validTask[index - 1];
    const to = validTask[index];
    segments.push({
      from,
      to,
      distanceKm: haversineDistanceKm(from, to),
      elevationDiffM:
        typeof from.elevationM === "number" && typeof to.elevationM === "number"
          ? to.elevationM - from.elevationM
          : null,
    });
  }

  return segments;
}

function renderFlightStats(fixes) {
  const stats = computeFlightStats(fixes);
  flightStats.innerHTML = "";

  const grid = el("div", "stat-grid");
  const items = [
    ["원본 최고 속도", `${formatNumber(stats.maxSpeedKmh, 1)} km/h`, stats.suspiciousCount ? "warn" : ""],
    ["이상치 제외 최고 속도", `${formatNumber(stats.cleanMaxSpeedKmh, 1)} km/h`, ""],
    ["평균 이동 속도", `${formatNumber(stats.avgMovingSpeedKmh, 1)} km/h`, ""],
    ["최대 상승", `${formatNumber(stats.maxClimbMs, 1)} m/s`, ""],
    ["최대 싱크", `${formatNumber(stats.maxSinkMs, 1)} m/s`, "warn"],
  ];

  items.forEach(([label, value, tone]) => {
    const card = el("article", `stat-pill ${tone}`.trim());
    card.append(el("h3", "", label));
    card.append(el("p", "", value));
    grid.append(card);
  });

  flightStats.append(grid);

  return stats;
}

function renderSegmentStats(task) {
  const segments = computeSegmentStats(task);
  segmentStats.innerHTML = "";

  if (!segments.length) {
    segmentStats.append(el("div", "empty", "구간 통계를 만들 task point가 부족합니다."));
    return;
  }

  segments.forEach((segment, index) => {
    const card = el("article", "segment-card");
    card.append(
      el(
        "h3",
        "",
        `${index + 1}. ${segment.from.name ?? "Point"} -> ${segment.to.name ?? "Point"}`,
      ),
    );
    card.append(
      el(
        "p",
        "",
        `직선 거리 ${formatNumber(segment.distanceKm, 2)}km | 반경 ${segment.from.radiusM ?? "-"}m -> ${segment.to.radiusM ?? "-"}m | 고도 변화 ${segment.elevationDiffM === null ? "-" : `${segment.elevationDiffM > 0 ? "+" : ""}${Math.round(segment.elevationDiffM)}m`}`,
      ),
    );
    segmentStats.append(card);
  });
}

function renderAnomalyStats(stats) {
  anomalyStats.innerHTML = "";
  const grid = el("div", "stat-grid");
  const items = [
    ["의심 구간 수", `${formatNumber(stats.suspiciousCount)}개`, stats.suspiciousCount ? "warn" : ""],
    ["원본 최고속도", `${formatNumber(stats.maxSpeedKmh, 1)} km/h`, stats.suspiciousCount ? "warn" : ""],
    ["정상 추정 최고속도", `${formatNumber(stats.cleanMaxSpeedKmh, 1)} km/h`, ""],
    ["판정 기준", "95km/h 초과 또는 급격한 튐", ""],
  ];

  items.forEach(([label, value, tone]) => {
    const card = el("article", `stat-pill ${tone}`.trim());
    card.append(el("h3", "", label));
    card.append(el("p", "", value));
    grid.append(card);
  });

  anomalyStats.append(grid);
}

function renderAnomalyList(stats) {
  anomalyList.innerHTML = "";
  const suspicious = stats.segments
    .filter((segment) => segment.suspicious)
    .sort((a, b) => b.speedKmh - a.speedKmh)
    .slice(0, 12);

  if (!suspicious.length) {
    anomalyList.append(el("div", "empty", "비정상 최고속도 후보가 보이지 않습니다."));
    return;
  }

  suspicious.forEach((segment, index) => {
    const card = el("article", "anomaly-card");
    card.append(
      el(
        "h3",
        "",
        `${index + 1}. ${formatClock(segment.from.time)} -> ${formatClock(segment.to.time)}`,
      ),
    );
    card.append(
      el(
        "p",
        "",
        `속도 ${formatNumber(segment.speedKmh, 1)}km/h | 거리 ${formatNumber(segment.distanceKm, 3)}km | 구간 ${segment.deltaSeconds}s | 상승률 ${formatNumber(segment.climbMs, 1)}m/s`,
      ),
    );
    anomalyList.append(card);
  });
}

function stopPlayback() {
  playbackState.playing = false;
  playbackToggle.textContent = "재생";
  if (playbackAnimationId) {
    window.clearInterval(playbackAnimationId);
    playbackAnimationId = null;
  }
}

function startPlaybackLoop() {
  if (!playbackState.fixes.length) {
    return;
  }

  stopPlayback();
  playbackState.playing = true;
  playbackToggle.textContent = "일시정지";

  const intervalMs = Math.max(20, Math.round(80 / playbackState.speedMultiplier));
  playbackAnimationId = window.setInterval(() => {
    const nextIndex = playbackState.currentIndex + 1;
    if (nextIndex >= playbackState.fixes.length) {
      stopPlayback();
      return;
    }
    updatePlayback(nextIndex);
  }, intervalMs);
}

function updatePlayback(index) {
  if (!playbackState.fixes.length) {
    return;
  }

  const safeIndex = Math.max(0, Math.min(index, playbackState.fixes.length - 1));
  playbackState.currentIndex = safeIndex;
  playbackRange.value = String(safeIndex);

  const current = playbackState.fixes[safeIndex];
  const currentTimeSeconds = parseTimeToSeconds(current.time);
  playbackTime.textContent =
    currentTimeSeconds !== null && playbackState.startTimeSeconds !== null
      ? formatElapsedSeconds(currentTimeSeconds - playbackState.startTimeSeconds)
      : "--:--:--";

  const seg = playbackState.segments.find((item) => item.index === safeIndex);
  playbackMeta.textContent = seg
    ? `속도 ${formatNumber(seg.speedKmh, 1)}km/h / 상승률 ${formatNumber(seg.climbMs, 1)}m/s`
    : "속도 - / 상승률 -";

  if (playbackLayer) {
    playbackLayer.clearLayers();
    if (typeof current.lat === "number" && typeof current.lon === "number") {
      const trail = playbackState.fixes
        .slice(0, safeIndex + 1)
        .filter((fix) => typeof fix.lat === "number" && typeof fix.lon === "number")
        .map((fix) => [fix.lat, fix.lon]);

      if (trail.length > 1) {
        window.L.polyline(trail, {
          color: "#cf5f3d",
          weight: 3,
          opacity: 0.85,
        }).addTo(playbackLayer);
      }

      playbackMarker = window.L.circleMarker([current.lat, current.lon], {
        radius: 8,
        color: "#cf5f3d",
        fillColor: "#cf5f3d",
        fillOpacity: 1,
        weight: 2,
      }).addTo(playbackLayer);
    }
  }

  renderAltitude(playbackState.fixes, safeIndex);
  renderAltitudeFooter(playbackState.fixes, safeIndex);
}

function setupPlayback(fixes, stats) {
  const validFixes = fixes.filter(
    (fix) => typeof fix.lat === "number" && typeof fix.lon === "number",
  );

  playbackState = {
    fixes: validFixes,
    segments: stats.segments,
    currentIndex: 0,
    playing: false,
    speedMultiplier: playbackState.speedMultiplier || 1,
    startTimeSeconds: validFixes.length ? parseTimeToSeconds(validFixes[0].time) : null,
    mapStyle: playbackState.mapStyle || "basic",
  };

  playbackRange.min = "0";
  playbackRange.max = String(Math.max(playbackState.fixes.length - 1, 0));
  playbackRange.value = "0";

  playbackToggle.onclick = () => {
    if (!playbackState.fixes.length) {
      return;
    }

    if (playbackState.playing) {
      stopPlayback();
      return;
    }

    startPlaybackLoop();
  };

  playbackRange.oninput = (event) => {
    stopPlayback();
    updatePlayback(Number(event.target.value));
  };

  speedToolbar.querySelectorAll("[data-speed]").forEach((button) => {
    button.onclick = () => {
      const speed = Number(button.dataset.speed);
      if (!speed || Number.isNaN(speed)) {
        return;
      }

      playbackState.speedMultiplier = speed;
      speedToolbar.querySelectorAll("[data-speed]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });

      if (playbackState.playing) {
        startPlaybackLoop();
      }
    };
  });

  mapStyleToolbar?.querySelectorAll("[data-map-style]").forEach((button) => {
    button.onclick = () => {
      const style = button.dataset.mapStyle;
      if (!style) {
        return;
      }
      applyMapStyle(style);
    };
  });

  updatePlayback(0);
}

async function boot() {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const flightId = searchParams.get("flight");
    const detailUrl = flightId
      ? `/api/igc-flights/${encodeURIComponent(flightId)}`
      : "./sample-flight.json";

    const response = await fetch(detailUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const raw = await response.json();
    const data = raw.flight ?? raw;

    if (flightId && detailBackLink) {
      detailBackLink.href = `./list.html?selected=${encodeURIComponent(flightId)}`;
    }

    statusPanel.hidden = true;
    metricsGrid.hidden = false;
    contentGrid.hidden = false;
    statsGrid.hidden = false;
    anomalyGrid.hidden = false;
    modeGrid.hidden = false;
    listsGrid.hidden = false;

    renderMetrics(data.summary, data.sourceFileName);
    renderTask(data.task ?? []);
    renderPhases(data.phaseEvents ?? []);
    renderMap(data.fixes ?? [], data.task ?? []);
    renderAltitude(data.fixes ?? []);
    renderAltitudeFooter(data.fixes ?? [], 0);
    const stats = renderFlightStats(data.fixes ?? []);
    const modeAnalysis = analyzeFlightModes(data.fixes ?? [], stats);
    renderAnomalyStats(stats);
    renderAnomalyList(stats);
    renderModeStats(modeAnalysis);
    renderModeList(modeAnalysis);
    renderModeOverlay(modeAnalysis);
    renderSegmentStats(data.task ?? []);
    setupPlayback(data.fixes ?? [], stats);
  } catch (error) {
    statusPanel.innerHTML = "";
    statusPanel.append(
      el(
        "div",
        "error",
        `샘플 데이터를 불러오지 못했습니다. ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

boot();
