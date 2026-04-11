"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { SiteRegistrationForm } from "@/components/sites/site-registration-form";
import { SiteRegistrationMapPreview } from "@/components/sites/site-registration-map-preview";
import { canUsePersonalStorage } from "@/lib/auth/profile";
import { extractLaunchSiteWindHint } from "@/lib/sites/launch-site-wind";
import type { KoreaLaunchSite } from "@/types/launch-site";
import type { ManageSiteListItem } from "@/types/manage-site";
import type { NewSiteRegistrationDraft } from "@/types/site-registration";

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
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 10c1.2-2.5 3.4-4 6.3-4 2.7 0 4.7 1.3 6 3.6" />
        <path d="M3 14c1.5-1.8 3.5-2.7 5.9-2.7 2.8 0 5 1.2 6.6 3.7" />
        <path d="M6 18c1-.8 2.1-1.2 3.5-1.2 1.5 0 2.8.5 4 1.6" />
      </svg>
    );
  }

  if (kind === "windy") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h9a3 3 0 1 0-3-3" />
        <path d="M4 16h13a2 2 0 1 1-2 2" />
        <path d="M4 8h6a2 2 0 1 0-2-2" />
      </svg>
    );
  }

  if (kind === "kma") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function getDisplayWindHint(
  selectedLaunchSite: KoreaLaunchSite | null,
  initialDraft: NewSiteRegistrationDraft
) {
  if (selectedLaunchSite) {
    return selectedLaunchSite.windHint ?? extractLaunchSiteWindHint(selectedLaunchSite.descriptionText) ?? "없음";
  }

  const directions = Array.from(
    new Set([
      ...initialDraft.preferredWind.best,
      ...initialDraft.preferredWind.conditional,
    ])
  );

  return directions.length > 0 ? directions.join(", ") : "없음";
}

export function SitePageModeContent({
  initialDraft,
  saveEndpoint,
  saveButtonLabel,
  uploadEndpoint,
  refreshOnSave,
  isFromManage: _isFromManage,
  isFromCatalog: _isFromCatalog,
  selectedSite,
  selectedLaunchSite,
}: {
  initialDraft: NewSiteRegistrationDraft;
  saveEndpoint: string;
  saveButtonLabel: string;
  uploadEndpoint: string;
  refreshOnSave: boolean;
  isFromManage: boolean;
  isFromCatalog: boolean;
  selectedSite: ManageSiteListItem | null;
  selectedLaunchSite: KoreaLaunchSite | null;
}) {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, getAccessToken } = useAuth();
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const isAdmin = Boolean(profile?.isAdmin);

  const sourceLinks = useMemo(() => {
    if (selectedLaunchSite?.sourceLinks?.length) {
      return selectedLaunchSite.sourceLinks;
    }

    return selectedSite?.sourceLinks ?? [];
  }, [selectedLaunchSite, selectedSite]);

  const displayWindHint = useMemo(
    () => getDisplayWindHint(selectedLaunchSite, initialDraft),
    [initialDraft, selectedLaunchSite]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFavoriteState() {
      if (!selectedLaunchSite || authLoading || !user || !canUsePersonalStorage(profile)) {
        if (!cancelled) {
          setIsFavorite(false);
        }
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
        const payload = (await response.json()) as { siteIds?: string[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "즐겨찾기 조회 실패");
        }

        if (!cancelled) {
          setIsFavorite((payload.siteIds ?? []).includes(selectedLaunchSite.id));
        }
      } catch {
        if (!cancelled) {
          setIsFavorite(false);
        }
      }
    }

    void loadFavoriteState();

    return () => {
      cancelled = true;
    };
  }, [authLoading, getAccessToken, profile, selectedLaunchSite, user]);

  async function toggleFavorite() {
    if (!selectedLaunchSite) {
      return;
    }

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

    setFavoriteSaving(true);
    setFavoriteError("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch("/api/favorites/sites", {
        method: isFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ siteId: selectedLaunchSite.id }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "즐겨찾기 저장 실패");
      }

      setIsFavorite((current) => !current);
    } catch (error) {
      setFavoriteError(
        error instanceof Error ? error.message : "즐겨찾기 저장 중 오류가 발생했습니다."
      );
    } finally {
      setFavoriteSaving(false);
    }
  }

  if (isAdmin) {
    return (
      <SiteRegistrationForm
        initialDraft={initialDraft}
        saveEndpoint={saveEndpoint}
        saveButtonLabel={saveButtonLabel}
        uploadEndpoint={uploadEndpoint}
        refreshOnSave={refreshOnSave}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-stone-200 bg-white px-6 py-8 shadow-sm md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">
            활공장 상세 보기
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              {selectedSite?.siteName ?? selectedLaunchSite?.sourceName ?? initialDraft.siteName}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              일반 회원은 활공장 상세 정보를 읽기 전용으로 확인할 수 있습니다. 위치,
              풍향, 운영 메모, 외부 기상 링크를 한 화면에서 볼 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/sites")}
              className="btn btn-secondary"
            >
              활공장 목록으로
            </button>
            {selectedLaunchSite ? (
              <button
                type="button"
                onClick={() => void toggleFavorite()}
                disabled={favoriteSaving}
                className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-60"
              >
                {favoriteSaving ? "저장 중..." : isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
              </button>
            ) : null}
          </div>
          {favoriteError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {favoriteError}
            </div>
          ) : null}
        </div>
      </section>

      <SiteRegistrationMapPreview
        launch={initialDraft.launch}
        landing={initialDraft.primaryLanding}
        activeTarget="launch"
        onPickLocation={() => {}}
        readOnly
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-500">기본 정보</p>
          <dl className="mt-5 space-y-3 text-sm text-stone-600">
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-stone-500">표시명</dt>
              <dd className="text-right font-medium text-stone-900">
                {selectedLaunchSite?.sourceName ?? initialDraft.siteName}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-stone-500">풍향</dt>
              <dd className="text-right font-medium text-stone-900">{displayWindHint}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-stone-500">이륙장 좌표</dt>
              <dd className="text-right font-medium text-stone-900">
                {initialDraft.launch.lat.toFixed(5)}, {initialDraft.launch.lng.toFixed(5)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-stone-500">이륙장 고도</dt>
              <dd className="text-right font-medium text-stone-900">
                {initialDraft.launch.elevationM}m
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-stone-500">웨이포인트</dt>
              <dd className="text-right font-medium text-stone-900">
                {initialDraft.waypointUpload.fileName || "없음"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-500">외부 링크</p>
          {sourceLinks.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {sourceLinks.map((link) => {
                const kind = classifyLink(link);
                const meta = getLinkMeta(kind);

                return (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    title={meta.label}
                    aria-label={meta.label}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-xs font-extrabold transition ${meta.className}`}
                  >
                    <LinkIcon kind={kind} />
                    <span className="sr-only">{meta.label}</span>
                    <span aria-hidden="true" className="ml-1 text-[10px] font-black tracking-tight">
                      {meta.shortLabel}
                    </span>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">등록된 외부 링크가 없습니다.</p>
          )}
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-500">병목 메모</p>
          <p className="mt-4 text-sm leading-6 text-stone-700">
            {initialDraft.routeNotes.bottleneckNotes || "입력 없음"}
          </p>
        </article>
        <article className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-500">회수 메모</p>
          <p className="mt-4 text-sm leading-6 text-stone-700">
            {initialDraft.routeNotes.retrieveNotes || "입력 없음"}
          </p>
        </article>
      </section>
    </div>
  );
}
