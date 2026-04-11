import fs from "node:fs/promises";
import path from "node:path";

function decodeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripCdata(text) {
  return text.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function htmlToText(html) {
  return decodeXml(
    stripCdata(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<img[^>]*>/gi, "")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function extractFirst(tag, text) {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function makeId(index, normalizedName, lng, lat) {
  const slug = normalizedName
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  return `${String(index + 1).padStart(3, "0")}-${slug || "launch-site"}-${Math.abs(
    Math.round(lng * 1000)
  )}-${Math.abs(Math.round(lat * 1000))}`;
}

function normalizeName(name) {
  return name
    .replace(/\s*-\s*(남풍|북풍|동풍|서풍|남서|남동|북서|북동|남서풍|남동풍|북서풍|북동풍|서풍&북풍|남풍&북풍|남서&서풍|남서&서풍|남서&북서|남동\/동|남동\s*\/\s*동|서풍\s*\/\s*북서풍)$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractWindHint(name) {
  const match = name.match(/-\s*(.+)$/u);
  return match ? match[1].trim() : null;
}

function extractWindHintFromText(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  const match = compact.match(
    /이륙장\s*-\s*([^\n(]+?(?:풍|북동|북서|남동|남서)(?:\s*[/,.]\s*[^\n(]+?(?:풍|북동|북서|남동|남서))*)/u
  );

  if (!match) {
    return null;
  }

  return match[1]
    .replace(/[.,]/g, " / ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(text) {
  const matches = text.match(/https?:\/\/[^\s<>()]+/g) ?? [];
  return [...new Set(matches)];
}

function filterWeatherLinks(links) {
  return links.filter((link) => {
    const normalized = link.toLowerCase();
    return (
      normalized.includes("windguru") ||
      normalized.includes("windy.com") ||
      normalized.includes("kma.go.kr")
    );
  });
}

async function main() {
  const sourcePath = process.argv[2];
  const outputPath = process.argv[3] ?? path.join(process.cwd(), "data/sites/korea-launch-sites.json");

  if (!sourcePath) {
    throw new Error("Usage: node scripts/extract-kml-launch-sites.mjs <source.kml> [output.json]");
  }

  const raw = await fs.readFile(sourcePath, "utf8");
  const placemarkMatches = [...raw.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)];

  const launchSites = placemarkMatches
    .map((match, index) => {
      const placemark = match[1];
      const sourceName = stripCdata(extractFirst("name", placemark) ?? "").trim();
      const descriptionRaw = extractFirst("description", placemark) ?? "";
      const coordinatesRaw = extractFirst("coordinates", placemark) ?? "";

      if (!sourceName || !coordinatesRaw) {
        return null;
      }

      const [lngText, latText, altText] = coordinatesRaw
        .split(",")
        .map((value) => value.trim());
      const lng = Number(lngText);
      const lat = Number(latText);
      const altitude = Number(altText ?? "");
      const normalizedName = normalizeName(sourceName);
      const descriptionText = htmlToText(descriptionRaw);
      const sourceLinks = filterWeatherLinks(extractLinks(descriptionText));
      const windHint = extractWindHint(sourceName) ?? extractWindHintFromText(descriptionText);

      return {
        id: makeId(index, normalizedName, lng, lat),
        sourceName,
        normalizedName,
        category: "launch_site",
        lat,
        lng,
        altitudeM: Number.isFinite(altitude) ? altitude : null,
        descriptionText,
        windHint,
        sourceLinks,
        sourceFile: path.basename(sourcePath),
      };
    })
    .filter(Boolean);

  await fs.writeFile(outputPath, `${JSON.stringify(launchSites, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourcePath,
        outputPath,
        count: launchSites.length,
        sample: launchSites.slice(0, 5).map((site) => ({
          sourceName: site.sourceName,
          normalizedName: site.normalizedName,
          lat: site.lat,
          lng: site.lng,
          windHint: site.windHint,
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
