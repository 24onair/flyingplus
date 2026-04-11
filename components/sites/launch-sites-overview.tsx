"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useAuth } from "@/components/auth/auth-provider";
import { canUsePersonalStorage } from "@/lib/auth/profile";
import type { KoreaLaunchSite } from "@/types/launch-site";
import { extractLaunchSiteWindHint } from "@/lib/sites/launch-site-wind";

const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (token) {
  mapboxgl.accessToken = token;
}

function getShortName(site: KoreaLaunchSite) {
  return site.normalizedName.replace(/\s*이륙장$/u, "").trim();
}

function getDisplayWindHint(site: KoreaLaunchSite) {
  return site.windHint ?? extractLaunchSiteWindHint(site.descriptionText) ?? "없음";
}

function getProvinceLabel(regionLabel: string) {
  switch (regionLabel) {
    case "서울·경기·인천":
      return "";
    case "강원":
      return "강원";
    case "충북":
      return "충북";
    case "충남·대전·세종":
      return "충남";
    case "전북":
      return "전북";
    case "전남·광주":
      return "전남";
    case "경북·대구":
      return "경북";
    case "경남·부산·울산":
      return "경남";
    case "제주":
      return "제주";
    default:
      return "";
  }
}

function buildDisplayAddress(site: KoreaLaunchSite, regionLabel: string) {
  const compact = site.descriptionText.replace(/\s+/g, " ").trim();
  const municipalityMatch = compact.match(/([가-힣]+(?:시|군|구))/u);
  const townMatch = compact.match(/([가-힣]+(?:읍|면|동|리))/u);
  const villageMatches = [...compact.matchAll(/([가-힣]+리)/gu)].map((match) => match[1]);

  const municipality = municipalityMatch?.[1] ?? "";
  const town = townMatch?.[1] ?? "";
  const village = villageMatches.find((name) => name !== town) ?? "";
  const province = getProvinceLabel(regionLabel);

  const parts = [province, municipality, town, village].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "주소 정보 없음";
}

type LinkKind = "windguru" | "windy" | "kma" | "other";

function classifyLink(link: string): LinkKind {
  const normalized = link.toLowerCase();

  if (normalized.includes("windguru")) {
    return "windguru";
  }

  if (normalized.includes("windy.com")) {
    return "windy";
  }

  if (normalized.includes("kma.go.kr")) {
    return "kma";
  }

  return "other";
}

function getLinkMeta(kind: LinkKind) {
  switch (kind) {
    case "windguru":
      return {
        label: "Windguru",
        shortLabel: "WG",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100",
      };
    case "windy":
      return {
        label: "Windy",
        shortLabel: "W",
        className:
          "border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-300 hover:bg-sky-100",
      };
    case "kma":
      return {
        label: "기상청",
        shortLabel: "K",
        className:
          "border-indigo-200 bg-indigo-50 text-indigo-900 hover:border-indigo-300 hover:bg-indigo-100",
      };
    default:
      return {
        label: "링크",
        shortLabel: "↗",
        className:
          "border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-300 hover:bg-stone-100",
      };
  }
}

function LinkIcon({ kind }: { kind: LinkKind }) {
  if (kind === "windguru") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />
        <path
          d="M4 10c1.7-2 3.4-3 5.3-3 2.4 0 4.1 1.3 6.7 1.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6 13c1.2-1 2.4-1.5 3.8-1.5 1.8 0 3 .8 4.9.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "windy") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />
        <path
          d="M5 8.2c1.1-1.6 2.5-2.4 4.1-2.4 2.1 0 3.3 1.3 3.3 2.7 0 1.4-1 2.3-2.5 2.3H4.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7.2 13.5h5.4c1.1 0 1.9-.6 1.9-1.5s-.8-1.5-1.7-1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "kma") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />
        <path
          d="M10 4.2v6.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M10 10.5l3.5 3.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="10" cy="10.2" r="1.7" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />
      <path
        d="M7.8 12.2 12.4 7.6M9 7.3h3.7V11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function detectRegion(site: KoreaLaunchSite) {
  const text = `${site.sourceName} ${site.descriptionText}`.toLowerCase();

  const regionMatchers: Array<[string, string[]]> = [
    ["서울·경기·인천", ["서울", "경기", "수원", "양평", "가평", "용인", "인천", "파주", "포천", "연천"]],
    ["강원", ["강원", "강릉", "평창", "횡성", "영월", "정선", "홍천", "원주", "춘천", "삼척", "양양"]],
    ["충북", ["충북", "충주", "단양", "제천", "보은", "옥천", "청주", "괴산", "영동"]],
    ["충남·대전·세종", ["충남", "대전", "세종", "천안", "공주", "서산", "논산", "보령", "당진", "금산"]],
    ["전북", ["전북", "전주", "익산", "남원", "정읍", "임실", "완주", "무주", "장수"]],
    ["전남·광주", ["전남", "광주", "순천", "여수", "곡성", "담양", "화순", "강진", "해남", "영암", "구례"]],
    ["경북·대구", ["경북", "대구", "문경", "상주", "영주", "안동", "예천", "청송", "포항", "구미", "김천", "경산"]],
    ["경남·부산·울산", ["경남", "부산", "울산", "밀양", "양산", "합천", "의령", "거창", "진주", "함안", "김해", "사천"]],
    ["제주", ["제주", "서귀포"]],
  ];

  const matched = regionMatchers.find(([, keywords]) =>
    keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  );

  return matched?.[0] ?? "미분류";
}

export function LaunchSitesOverview({
  sites,
  managedSites,
}: {
  sites: KoreaLaunchSite[];
  managedSites: Array<{
    siteId: string;
    siteName: string;
    regionName: string;
    launchName: string;
    launchLat: number;
    launchLng: number;
  }>;
}) {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, getAccessToken } = useAuth();
  const isAdmin = Boolean(profile?.isAdmin);
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("전체");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [terrainElevations, setTerrainElevations] = useState<Record<string, number | null>>({});
  const [favoriteSiteIds, setFavoriteSiteIds] = useState<string[]>([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [favoriteSavingId, setFavoriteSavingId] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<Record<string, mapboxgl.Marker>>({});
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const sitesWithRegion = useMemo(() => {
    const managedIndex = managedSites.map((managedSite) => ({
      ...managedSite,
      normalizedName: managedSite.siteName.replace(/\s+/g, "").toLowerCase(),
      normalizedRegionName: managedSite.regionName.replace(/\s+/g, "").toLowerCase(),
      normalizedLaunchName: managedSite.launchName.replace(/\s+/g, "").toLowerCase(),
    }));

    return sites.map((site) => ({
      ...site,
      regionLabel: detectRegion(site),
      managedSiteId:
        managedIndex.find((managedSite) => {
          const normalizedSourceName = site.sourceName.replace(/\s+/g, "").toLowerCase();
          const normalizedShortName = getShortName(site).replace(/\s+/g, "").toLowerCase();
          const latClose = Math.abs(site.lat - managedSite.launchLat) < 0.08;
          const lngClose = Math.abs(site.lng - managedSite.launchLng) < 0.08;

          return (
            normalizedSourceName.includes(managedSite.normalizedName) ||
            normalizedShortName.includes(managedSite.normalizedName) ||
            normalizedSourceName.includes(managedSite.normalizedRegionName) ||
            normalizedSourceName.includes(managedSite.normalizedLaunchName) ||
            (latClose && lngClose)
          );
        })?.siteId ?? null,
    }));
  }, [managedSites, sites]);

  const sitesWithRegionAndOfficial = useMemo(
    () =>
      sitesWithRegion.map((site) => ({
        ...site,
        isOfficial: Boolean(site.managedSiteId),
      })),
    [sitesWithRegion]
  );

  const regionOptions = useMemo(() => {
    return ["전체", ...new Set(sitesWithRegionAndOfficial.map((site) => site.regionLabel))];
  }, [sitesWithRegionAndOfficial]);

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sitesWithRegionAndOfficial
      .filter((site) => {
        const matchesRegion =
          regionFilter === "전체" || site.regionLabel === regionFilter;
        const matchesFavorite = !favoritesOnly || favoriteSiteIds.includes(site.id);

        const matchesQuery =
          !normalizedQuery ||
          site.sourceName.toLowerCase().includes(normalizedQuery) ||
          site.normalizedName.toLowerCase().includes(normalizedQuery) ||
          site.descriptionText.toLowerCase().includes(normalizedQuery);

        return matchesRegion && matchesQuery && matchesFavorite;
      })
      .sort((a, b) => {
        const aFavorite = favoriteSiteIds.includes(a.id);
        const bFavorite = favoriteSiteIds.includes(b.id);

        if (aFavorite !== bFavorite) {
          return aFavorite ? -1 : 1;
        }

        if (a.isOfficial !== b.isOfficial) {
          return a.isOfficial ? -1 : 1;
        }

        return a.sourceName.localeCompare(b.sourceName, "ko");
      });
  }, [favoriteSiteIds, favoritesOnly, query, regionFilter, sitesWithRegionAndOfficial]);

  const selectedSite = useMemo(() => {
    return filteredSites.find((site) => site.id === selectedSiteId) ?? null;
  }, [filteredSites, selectedSiteId]);

  const displayedSites = useMemo(() => {
    return filteredSites;
  }, [filteredSites, selectedSiteId]);

  useEffect(() => {
    if (!selectedSiteId && filteredSites[0]) {
      setSelectedSiteId(filteredSites[0].id);
      return;
    }

    if (selectedSiteId && !filteredSites.some((site) => site.id === selectedSiteId)) {
      setSelectedSiteId(filteredSites[0]?.id ?? "");
    }
  }, [filteredSites, selectedSiteId]);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (authLoading) {
        return;
      }

      if (!user || !canUsePersonalStorage(profile)) {
        setFavoriteSiteIds([]);
        return;
      }

      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          return;
        }

        const response = await fetch("/api/favorites/sites", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = (await response.json()) as {
          siteIds?: string[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "즐겨찾기 조회 실패");
        }

        if (!cancelled) {
          setFavoriteSiteIds(payload.siteIds ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setFavoriteError(
            error instanceof Error ? error.message : "즐겨찾기를 불러오지 못했습니다."
          );
        }
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [authLoading, getAccessToken, profile, user]);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) {
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [127.8, 36.1],
      zoom: 6.3,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      if (!map.getSource("launch-sites-dem")) {
        map.addSource("launch-sites-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }

      map.setTerrain({
        source: "launch-sites-dem",
        exaggeration: 1.05,
      });
    });

    mapRef.current = map;

    return () => {
      Object.values(markerRefs.current).forEach((marker) => marker.remove());
      markerRefs.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    Object.values(markerRefs.current).forEach((marker) => marker.remove());
    markerRefs.current = {};

    if (filteredSites.length === 0) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();

    filteredSites.forEach((site) => {
      bounds.extend([site.lng, site.lat]);

      const el = document.createElement("button");
      el.type = "button";
      el.title = site.sourceName;
      el.className =
        "flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-stone-900 shadow-[0_6px_18px_rgba(28,25,23,0.35)]";
      el.innerHTML =
        '<span class="block h-2.5 w-2.5 rounded-full bg-sky-300 transition-transform duration-150 ease-out"></span>';

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([site.lng, site.lat])
        .addTo(map);

      el.addEventListener("click", () => {
        setSelectedSiteId(site.id);
      });

      markerRefs.current[site.id] = marker;
    });

    map.fitBounds(bounds, {
      padding: 56,
      maxZoom: 9.5,
      duration: 500,
    });
  }, [filteredSites]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || filteredSites.length === 0) {
      return;
    }

    let cancelled = false;

    const updateElevations = () => {
      if (cancelled) {
        return;
      }

      const nextEntries = filteredSites.map((site) => {
        const elevation = map.queryTerrainElevation([site.lng, site.lat], {
          exaggerated: false,
        });

        return [
          site.id,
          elevation === null || elevation === undefined ? null : Math.round(elevation),
        ] as const;
      });

      if (nextEntries.every(([, value]) => value === null)) {
        return;
      }

      setTerrainElevations((current) => ({
        ...current,
        ...Object.fromEntries(nextEntries),
      }));
    };

    if (map.loaded()) {
      updateElevations();
    }

    map.once("idle", updateElevations);

    return () => {
      cancelled = true;
      map.off("idle", updateElevations);
    };
  }, [filteredSites]);

  useEffect(() => {
    filteredSites.forEach((site) => {
      const marker = markerRefs.current[site.id];
      const element = marker?.getElement();
      const indicator = element?.firstElementChild as HTMLElement | null;

      if (!element || !indicator) {
        return;
      }

      const isSelected = site.id === selectedSiteId;
      element.style.background = isSelected ? "#082f49" : "#1c1917";
      element.style.boxShadow = isSelected
        ? "0 10px 24px rgba(8, 47, 73, 0.28)"
        : "0 6px 18px rgba(28, 25, 23, 0.35)";
      indicator.style.transform = isSelected ? "scale(1.45)" : "scale(1)";
      indicator.style.background = isSelected ? "#7dd3fc" : "#38bdf8";
    });

    const selectedCard = cardRefs.current[selectedSiteId];
    selectedCard?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [filteredSites, selectedSiteId]);

  function getDisplayAltitude(site: KoreaLaunchSite) {
    const terrainAltitude = terrainElevations[site.id];

    if (terrainAltitude !== undefined && terrainAltitude !== null) {
      return `${terrainAltitude}m`;
    }

    if (site.altitudeM && site.altitudeM > 0) {
      return `${site.altitudeM}m`;
    }

    return "고도 계산 중";
  }

  async function toggleFavoriteSite(siteId: string) {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!canUsePersonalStorage(profile)) {
      setFavoriteError("관리자 승인 후 좋아하는 활공장을 저장할 수 있습니다.");
      return;
    }

    setFavoriteSavingId(siteId);
    setFavoriteError("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.push("/auth/login");
        return;
      }

      const isFavorite = favoriteSiteIds.includes(siteId);
      const response = await fetch("/api/favorites/sites", {
        method: isFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ siteId }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "즐겨찾기 저장 실패");
      }

      setFavoriteSiteIds((current) =>
        isFavorite ? current.filter((id) => id !== siteId) : [...current, siteId]
      );
    } catch (error) {
      setFavoriteError(
        error instanceof Error ? error.message : "즐겨찾기 저장 중 오류가 발생했습니다."
      );
    } finally {
      setFavoriteSavingId("");
    }
  }

  return (
    <section className="space-y-5">
      <div className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">
            전국 활공장 원본 목록
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
              KML에서 추출한 전국 활공장 141개
            </h2>
            <p className="max-w-4xl text-base leading-7 text-stone-600 md:text-lg">
              이름, 풍향, 메모, 좌표, 고도, 기상 링크를 포함한 활공장 원본 데이터입니다.
              지도에서 선택하면 아래 목록과 함께 확인할 수 있습니다.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_240px]">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-600">활공장 검색</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="문경, 간월재, 활공랜드, 북풍..."
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-600">지역 필터</span>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                {regionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-[24px] border border-stone-200 bg-white/85 px-4 py-3 text-sm text-stone-600">
              <p className="font-semibold text-stone-900">현재 표시</p>
              <p className="mt-1 text-2xl font-bold text-sky-900">{filteredSites.length}개</p>
              <p className="mt-2 leading-6">
                지역:{" "}
                <span className="font-semibold text-stone-900">{regionFilter}</span>
              </p>
              <p className="leading-6">
                선택 활공장:{" "}
                <span className="font-semibold text-stone-900">
                  {selectedSite?.sourceName ?? "없음"}
                </span>
              </p>
              <label className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(event) => setFavoritesOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs font-semibold text-stone-700">
                  즐겨찾기만 보기
                </span>
              </label>
            </div>
          </div>
          {favoriteError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {favoriteError}
            </div>
          ) : null}
        </div>
      </div>

      <section className="rounded-[28px] border border-stone-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
          <div>
            <p className="text-sm font-semibold text-stone-500">전국 활공장 지도</p>
            <p className="text-sm text-stone-700">
              지역 필터를 바꾸면 지도 마커도 바로 같이 줄어들고, 마커를 클릭하면 아래
              원본 목록에서 같은 활공장이 선택된 상태로 표시됩니다.
            </p>
          </div>
          {selectedSite ? (
            <div className="text-right text-xs font-medium text-stone-500">
              <p className="font-semibold text-stone-800">{selectedSite.sourceName}</p>
              <p>{buildDisplayAddress(selectedSite, selectedSite.regionLabel)}</p>
              <p>
                {selectedSite.lat.toFixed(5)}, {selectedSite.lng.toFixed(5)}
              </p>
              <p>{selectedSite.windHint ?? "풍향 메모 없음"}</p>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void toggleFavoriteSite(selectedSite.id);
                  }}
                  disabled={favoriteSavingId === selectedSite.id}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-[11px] font-bold text-rose-900 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-60"
                >
                  {favoriteSavingId === selectedSite.id
                    ? "저장 중..."
                    : favoriteSiteIds.includes(selectedSite.id)
                      ? "즐겨찾기 해제"
                      : "즐겨찾기"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {token ? (
          <div
            ref={containerRef}
            className="h-[380px] overflow-hidden rounded-[22px]"
          />
        ) : (
          <div className="rounded-[22px] bg-stone-100 p-5 text-sm leading-6 text-stone-600">
            Mapbox 토큰이 없어서 지도는 숨기고 목록만 표시합니다.
          </div>
        )}
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {displayedSites.map((site) => {
          const isSelected = site.id === selectedSiteId;
          const detailHref = site.managedSiteId
            ? `/sites/new?siteId=${site.managedSiteId}&catalogSiteId=${site.id}`
            : `/sites/new?catalogSiteId=${site.id}`;
          return (
            <article
              key={site.id}
              ref={(element) => {
                cardRefs.current[site.id] = element;
              }}
              onClick={() => router.push(detailHref)}
              className={`relative overflow-hidden rounded-[28px] border p-5 shadow-sm transition duration-200 ${
                isSelected
                  ? "border-sky-500 bg-[linear-gradient(180deg,#eef9ff_0%,#dff3ff_100%)] shadow-[0_20px_44px_rgba(2,132,199,0.16)] ring-2 ring-sky-400/35"
                  : "glass border-stone-200 bg-[rgba(255,252,246,0.92)]"
              }`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-1.5 transition ${
                  isSelected ? "bg-sky-500" : "bg-transparent"
                }`}
              />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                    {getShortName(site)}
                  </span>
                  <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
                    {site.regionLabel}
                  </span>
                  {site.isOfficial ? (
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                      [상세] 정식 등록
                    </span>
                  ) : null}
                  {favoriteSiteIds.includes(site.id) ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                      즐겨찾기
                    </span>
                  ) : null}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">
                    {site.isOfficial ? `[상세] ${site.sourceName}` : site.sourceName}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-stone-500">
                    {getDisplayWindHint(site)}
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-sm text-stone-600">
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">주소</dt>
                  <dd className="max-w-[70%] text-right font-medium text-stone-900">
                    {buildDisplayAddress(site, site.regionLabel)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">표시명</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {site.sourceName}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">풍향</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {getDisplayWindHint(site)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">좌표</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-stone-500">고도</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {getDisplayAltitude(site)}
                  </dd>
                </div>
              </dl>

              {site.sourceLinks.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void toggleFavoriteSite(site.id);
                    }}
                    disabled={favoriteSavingId === site.id}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-900 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-60"
                  >
                    {favoriteSavingId === site.id
                      ? "저장 중..."
                      : favoriteSiteIds.includes(site.id)
                        ? "즐겨찾기 해제"
                        : "즐겨찾기"}
                  </button>
                  {!site.isOfficial && isAdmin ? (
                    <a
                      href={`/sites/new?catalogSiteId=${site.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        router.push(`/sites/new?catalogSiteId=${site.id}`);
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-900 transition hover:border-amber-300 hover:bg-amber-100"
                    >
                      정식 등록
                    </a>
                  ) : null}
                  {site.sourceLinks.slice(0, 3).map((link) => (
                    (() => {
                      const kind = classifyLink(link);
                      const meta = getLinkMeta(kind);

                      return (
                        <a
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          title={meta.label}
                          aria-label={meta.label}
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xs font-extrabold transition ${meta.className}`}
                        >
                          <LinkIcon kind={kind} />
                          <span className="sr-only">{meta.label}</span>
                          <span aria-hidden="true" className="text-[10px] font-black tracking-tight">
                            {meta.shortLabel}
                          </span>
                        </a>
                      );
                    })()
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void toggleFavoriteSite(site.id);
                    }}
                    disabled={favoriteSavingId === site.id}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-900 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-60"
                  >
                    {favoriteSavingId === site.id
                      ? "저장 중..."
                      : favoriteSiteIds.includes(site.id)
                        ? "즐겨찾기 해제"
                        : "즐겨찾기"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </section>
  );
}
