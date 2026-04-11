import type { WaypointCategory, WaypointRecord } from "@/types/course";

type RawWaypoint = {
  code: string;
  lat: number;
  lng: number;
  elevationM: number;
  label: string;
};

const source = "2024 Mungyeong Waypoints v3-geo.wpt";

const rawWaypoints: RawWaypoint[] = [
  { code: "L66N", lat: 36.428183, lng: 128.239067, elevationM: 49, label: "L66 New" },
  { code: "A40", lat: 37.0297, lng: 127.886667, elevationM: 76, label: "Chungju airport" },
  { code: "A50", lat: 36.631, lng: 128.355, elevationM: 100, label: "AIRPORT- YECHEON" },
  { code: "A60", lat: 35.894983, lng: 128.656, elevationM: 33, label: "Daegu Airport" },
  { code: "A70", lat: 36.718717, lng: 127.498633, elevationM: 53, label: "Cheongju Airport" },
  { code: "L01", lat: 36.991833, lng: 128.361, elevationM: 140, label: "LANDING- DANYANG" },
  { code: "L04", lat: 36.216333, lng: 128.356167, elevationM: 30, label: "Gumi" },
  { code: "L11", lat: 36.789533, lng: 127.83705, elevationM: 109, label: "Goesan" },
  { code: "L13", lat: 37.373017, lng: 128.4111, elevationM: 297, label: "Pyeongchang Landing" },
  { code: "L15", lat: 35.867867, lng: 128.190317, elevationM: 103, label: "Seongju Landing" },
  { code: "L17", lat: 36.431733, lng: 127.75115, elevationM: 141, label: "Boeun-gun" },
  { code: "L19", lat: 36.318233, lng: 128.288367, elevationM: 34, label: "Gumi Landing" },
  { code: "L20", lat: 35.6912, lng: 127.928483, elevationM: 185, label: "Geochang Landing" },
  { code: "L23", lat: 36.737, lng: 128.154167, elevationM: 230, label: "LANDING- GOYORI" },
  { code: "L40", lat: 36.869317, lng: 128.5204, elevationM: 209, label: "------ ------" },
  { code: "L42", lat: 36.806183, lng: 128.610433, elevationM: 142, label: "------ ------" },
  { code: "L45", lat: 36.526283, lng: 128.270867, elevationM: 50, label: "LANDING- YoungPung" },
  { code: "L45N", lat: 36.524067, lng: 128.2701, elevationM: 55, label: "L45 new" },
  { code: "L47", lat: 36.556717, lng: 128.705917, elevationM: 90, label: "CITY ANDONG" },
  { code: "L59", lat: 36.241833, lng: 128.562, elevationM: 80, label: "LANDING- GunWi" },
  { code: "L61", lat: 36.137433, lng: 128.154183, elevationM: 60, label: "LANDING- Gimcheon" },
  { code: "L66", lat: 36.420317, lng: 128.238283, elevationM: 47, label: "Sangju Landing" },
  { code: "M02", lat: 36.900333, lng: 128.090833, elevationM: 420, label: "TEMPLE- BODEOKAM" },
  { code: "M03", lat: 36.815167, lng: 128.029833, elevationM: 380, label: "GYMNASIUM- LEEHAW" },
  { code: "M06", lat: 36.829, lng: 128.146833, elevationM: 830, label: "Migolchi" },
  { code: "M07", lat: 36.8125, lng: 128.216833, elevationM: 1100, label: "MT- DaeMi" },
  { code: "M10", lat: 36.778833, lng: 128.106833, elevationM: 1000, label: "MT- JUHEUL" },
  { code: "M12", lat: 36.7665, lng: 128.003167, elevationM: 240, label: "RAMP- YEONPUNG" },
  { code: "M20", lat: 36.756333, lng: 128.198833, elevationM: 1050, label: "MT- UNDAL" },
  { code: "M22", lat: 36.733667, lng: 128.106167, elevationM: 160, label: "HEADQUARTERS" },
  { code: "M24", lat: 36.739667, lng: 128.174167, elevationM: 670, label: "TAKEOFF- MUNGYEONG2" },
  { code: "M27", lat: 36.731167, lng: 128.174667, elevationM: 840, label: "TAKEOFF- MUNGYEONG1" },
  { code: "M28", lat: 36.7205, lng: 128.144167, elevationM: 670, label: "MT- BONGMYEONG" },
  { code: "M29", lat: 36.715, lng: 128.1625, elevationM: 340, label: "GOLF COURSE" },
  { code: "M30", lat: 36.723483, lng: 128.242633, elevationM: 267, label: "--------- --------" },
  { code: "M31", lat: 36.710333, lng: 128.2, elevationM: 780, label: "MT- BUGOKRI" },
  { code: "M32", lat: 36.698, lng: 128.093833, elevationM: 710, label: "MT- SeongJu" },
  { code: "M33", lat: 36.652817, lng: 128.157567, elevationM: 195, label: "------------------" },
  { code: "M35", lat: 36.666667, lng: 128.129333, elevationM: 140, label: "FORTRESS- GOMOSAN" },
  { code: "M41", lat: 36.6715, lng: 127.864333, elevationM: 240, label: "SCHOOL- SongMyeon" },
  { code: "M43", lat: 36.593167, lng: 128.187333, elevationM: 100, label: "STADIUM- JEOMCHON" },
  { code: "M44", lat: 36.35745, lng: 128.689533, elevationM: 82, label: "-------------" },
  { code: "M45", lat: 36.467, lng: 128.278533, elevationM: 301, label: "MT- Hwanggum TO" },
  { code: "M46", lat: 36.539833, lng: 128.5145, elevationM: 120, label: "VILLAGE- HaHoe" },
  { code: "M48", lat: 36.517, lng: 127.815667, elevationM: 370, label: "JeongEiPumSong" },
  { code: "M52", lat: 36.451333, lng: 127.8085, elevationM: 140, label: "MaRo Myeon" },
  { code: "M53", lat: 36.445833, lng: 127.952667, elevationM: 300, label: "SCHOOL- Hwaseo" },
  { code: "M54", lat: 36.4295, lng: 128.093333, elevationM: 620, label: "MT- Noeum" },
  { code: "M57", lat: 36.302167, lng: 127.9055, elevationM: 900, label: "MT- BaekHwa" },
  { code: "M58", lat: 36.293333, lng: 128.096, elevationM: 80, label: "BRG- ChoOh" },
  { code: "M60", lat: 36.957567, lng: 128.48485, elevationM: 1411, label: "Birobong" },
  { code: "M61", lat: 36.811367, lng: 128.42045, elevationM: 1027, label: "Waypoint M61" },
  { code: "M62", lat: 36.0549, lng: 127.9165, elevationM: 1125, label: "Mt- Seokgyo-" },
  { code: "M65", lat: 37.098583, lng: 128.916317, elevationM: 1565, label: "Taeback San" },
  { code: "M66", lat: 36.1643, lng: 128.9772, elevationM: 1114, label: "Yeongcheon Mt- Bohyeon" },
  { code: "M67", lat: 36.98395, lng: 128.258033, elevationM: 857, label: "Mt Gumsu" },
  { code: "M68", lat: 37.00865, lng: 128.1433, elevationM: 490, label: "Mt Bibong Takeoff" },
];

function classifyWaypoint(code: string, label: string): WaypointCategory {
  const upperLabel = label.toUpperCase();

  if (
    upperLabel.includes("TAKEOFF") ||
    upperLabel.includes("RAMP") ||
    code === "M12" ||
    code === "M68"
  ) {
    return "launch";
  }

  if (code.startsWith("L") || upperLabel.includes("LANDING")) {
    return "landing";
  }

  if (code.startsWith("A") || upperLabel.includes("AIRPORT")) {
    return "reference";
  }

  if (!label.trim() || /^-+$/.test(label.replace(/\s+/g, ""))) {
    return "reference";
  }

  return "turnpoint";
}

export const mungyeongWaypoints: WaypointRecord[] = rawWaypoints.map((item) => ({
  siteId: "mungyeong",
  code: item.code,
  name: item.code,
  label: item.label,
  lat: item.lat,
  lng: item.lng,
  elevationM: item.elevationM,
  category: classifyWaypoint(item.code, item.label),
  source,
}));

export function getMungyeongWaypoint(code: string) {
  const waypoint = mungyeongWaypoints.find((item) => item.code === code);

  if (!waypoint) {
    throw new Error(`Unknown Mungyeong waypoint: ${code}`);
  }

  return waypoint;
}

export function getMungyeongWaypointDatabase() {
  return mungyeongWaypoints;
}
