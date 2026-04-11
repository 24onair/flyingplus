const baseUrl = process.argv[2] ?? "http://localhost:3000";
const routes = [
  "/",
  "/sites",
  "/sites/catalog",
  "/sites/manage",
  "/sites/new",
  "/briefing",
  "/compare",
  "/courses",
];

async function checkRoute(route) {
  const url = new URL(route, baseUrl).toString();

  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    return {
      route,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
    };
  } catch (error) {
    return {
      route,
      ok: false,
      status: "FETCH_ERROR",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const startedAt = Date.now();
  const results = [];

  for (const route of routes) {
    results.push(await checkRoute(route));
  }

  const failed = results.filter((result) => !result.ok);
  const payload = {
    baseUrl,
    checkedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    ok: failed.length === 0,
    results,
  };

  console.log(JSON.stringify(payload, null, 2));

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
