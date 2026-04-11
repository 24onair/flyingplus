"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteRegistrationMapPreview } from "@/components/sites/site-registration-map-preview";
import { WindSectorPicker } from "@/components/sites/wind-sector-picker";
import type {
  NewSiteRegistrationDraft,
  NewSiteRegistrationPreview,
} from "@/types/site-registration";
import { regionTypeOptions } from "@/types/site-registration";
import type { SiteConfig } from "@/types/site";
import { defaultNewSiteDraft } from "@/lib/sites/site-registration";

export function SiteRegistrationForm({
  initialDraft = defaultNewSiteDraft,
  saveEndpoint,
  saveButtonLabel = "설정 저장",
  uploadEndpoint,
  refreshOnSave = false,
}: {
  initialDraft?: NewSiteRegistrationDraft;
  saveEndpoint?: string;
  saveButtonLabel?: string;
  uploadEndpoint?: string;
  refreshOnSave?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<NewSiteRegistrationDraft>(initialDraft);
  const [activeMapTarget, setActiveMapTarget] = useState<"launch" | "landing">(
    "launch"
  );
  const [activeWindBucket, setActiveWindBucket] =
    useState<keyof SiteConfig["preferredWind"]>("best");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );
  const [saveMessage, setSaveMessage] = useState("");
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedWaypointFile, setSelectedWaypointFile] = useState<File | null>(null);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    setSaveState("idle");
    setSaveMessage("");
    setUploadState("idle");
    setUploadMessage("");
    setSelectedWaypointFile(null);
  }, [draft.siteId]);

  const preview = useMemo<NewSiteRegistrationPreview>(
    () => ({
      summary: {
        siteId: draft.siteId,
        name: draft.siteName,
        tagline: draft.tagline,
      },
      config: {
        siteId: draft.siteId,
        siteName: draft.siteName,
        regionType: draft.regionType,
        launch: draft.launch,
        preferredWind: draft.preferredWind,
        windThresholds: draft.windThresholds,
        thermalThresholds: draft.thermalThresholds,
        baseThresholdsM: draft.baseThresholdsM,
        launchWindows: draft.launchWindows,
        scoreAdjustments: draft.scoreAdjustments,
        riskProfile: draft.riskProfile,
      },
      metadata: {
        regionName: draft.regionName,
        primaryLanding: draft.primaryLanding,
        waypointUpload: draft.waypointUpload,
        routeNotes: draft.routeNotes,
      },
    }),
    [draft]
  );

  function updateDraft<K extends keyof NewSiteRegistrationDraft>(
    key: K,
    value: NewSiteRegistrationDraft[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateLaunchField(
    key: keyof NewSiteRegistrationDraft["launch"],
    value: string | number
  ) {
    setDraft((current) => ({
      ...current,
      launch: {
        ...current.launch,
        [key]: value,
      },
    }));
  }

  function updateLandingField(
    key: keyof NewSiteRegistrationDraft["primaryLanding"],
    value: string | number
  ) {
    setDraft((current) => ({
      ...current,
      primaryLanding: {
        ...current.primaryLanding,
        [key]: value,
      },
    }));
  }

  function updateRiskField(
    key: keyof NewSiteRegistrationDraft["riskProfile"],
    value: boolean
  ) {
    setDraft((current) => ({
      ...current,
      riskProfile: {
        ...current.riskProfile,
        [key]: value,
      },
    }));
  }

  function updateWaypointUploadField(
    key: keyof NewSiteRegistrationDraft["waypointUpload"],
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      waypointUpload: {
        ...current.waypointUpload,
        [key]: value,
      },
    }));
  }

  function updateRouteNoteField(
    key: keyof NewSiteRegistrationDraft["routeNotes"],
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      routeNotes: {
        ...current.routeNotes,
        [key]: value,
      },
    }));
  }

  function updatePreferredWind(value: SiteConfig["preferredWind"]) {
    setDraft((current) => ({
      ...current,
      preferredWind: value,
    }));
  }

  function handleMapPick(
    target: "launch" | "landing",
    lat: number,
    lng: number,
    elevationM: number | null
  ) {
    if (target === "launch") {
      updateLaunchField("lat", lat);
      updateLaunchField("lng", lng);
      if (elevationM != null) {
        updateLaunchField("elevationM", elevationM);
      }
      return;
    }

    updateLandingField("lat", lat);
    updateLandingField("lng", lng);
    if (elevationM != null) {
      updateLandingField("elevationM", elevationM);
    }
  }

  async function handleSave() {
    if (!saveEndpoint) {
      return;
    }

    setSaveState("saving");
    setSaveMessage("");

    try {
      const response = await fetch(saveEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "설정 저장에 실패했습니다.");
      }

      setSaveState("done");
      setSaveMessage(payload.message ?? "설정을 저장했습니다.");

      if (refreshOnSave) {
        router.refresh();
      }
    } catch (error) {
      setSaveState("error");
      setSaveMessage(
        error instanceof Error ? error.message : "설정 저장 중 알 수 없는 오류"
      );
    }
  }

  async function handleWaypointUpload() {
    if (!uploadEndpoint || !selectedWaypointFile) {
      return;
    }

    setUploadState("uploading");
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("siteId", draft.siteId);
      formData.append("file", selectedWaypointFile);

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        fileName?: string;
        fileType?: string;
        parsedCount?: number;
      };

      if (!response.ok || !payload.fileName || !payload.fileType) {
        throw new Error(payload.error ?? "웨이포인트 업로드에 실패했습니다.");
      }

      updateWaypointUploadField("fileName", payload.fileName);
      updateWaypointUploadField("fileType", payload.fileType);
      setUploadState("done");
      setUploadMessage(
        payload.parsedCount && payload.parsedCount > 0
          ? `${payload.message ?? "웨이포인트 파일을 업로드했습니다."} (${payload.parsedCount}개 포인트 반영)`
          : payload.message ?? "웨이포인트 파일을 업로드했습니다."
      );
      setSelectedWaypointFile(null);
    } catch (error) {
      setUploadState("error");
      setUploadMessage(
        error instanceof Error ? error.message : "웨이포인트 업로드 중 오류"
      );
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="min-w-0 space-y-6">
        <section className="glass rounded-[28px] border p-5">
          <p className="text-sm font-semibold text-stone-500">기본 정보</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label="활공장 ID"
              value={draft.siteId}
              onChange={(value) => updateDraft("siteId", value)}
            />
            <Field
              label="활공장 이름"
              value={draft.siteName}
              onChange={(value) => updateDraft("siteName", value)}
            />
            <Field
              label="지역명"
              value={draft.regionName}
              onChange={(value) => updateDraft("regionName", value)}
            />
            <Field
              label="한줄 설명"
              value={draft.tagline}
              onChange={(value) => updateDraft("tagline", value)}
            />
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-stone-700">지역 타입</span>
              <select
                value={draft.regionType}
                onChange={(event) =>
                  updateDraft(
                    "regionType",
                    event.target.value as NewSiteRegistrationDraft["regionType"]
                  )
                }
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400"
              >
                {regionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="glass rounded-[28px] border p-5">
          <p className="text-sm font-semibold text-stone-500">위치 정보</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[24px] bg-stone-100 p-3">
            <button
              type="button"
              onClick={() => setActiveMapTarget("launch")}
              className={`btn ${ 
                activeMapTarget === "launch"
                  ? "btn-primary"
                  : "btn-secondary"
              }`}
            >
              TakeOff 좌표 찍기
            </button>
            <button
              type="button"
              onClick={() => setActiveMapTarget("landing")}
              className={`btn ${
                activeMapTarget === "landing"
                  ? "btn-primary"
                  : "btn-secondary"
              }`}
            >
              Landing 좌표 찍기
            </button>
            <p className="text-sm text-stone-600">
              지도를 움직인 뒤 클릭하면 현재 선택한 대상의 위도/경도와 지형 고도가 자동 입력됩니다.
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label="이륙장 이름"
              value={draft.launch.name}
              onChange={(value) => updateLaunchField("name", value)}
            />
            <Field
              label="이륙장 고도 (m)"
              type="number"
              value={String(draft.launch.elevationM)}
              onChange={(value) => updateLaunchField("elevationM", Number(value))}
            />
            <Field
              label="위도"
              type="number"
              step="0.000001"
              value={String(draft.launch.lat)}
              onChange={(value) => updateLaunchField("lat", Number(value))}
            />
            <Field
              label="경도"
              type="number"
              step="0.000001"
              value={String(draft.launch.lng)}
              onChange={(value) => updateLaunchField("lng", Number(value))}
            />
            <Field
              label="대표 랜딩장 이름"
              value={draft.primaryLanding.name}
              onChange={(value) => updateLandingField("name", value)}
            />
            <Field
              label="랜딩장 고도 (m)"
              type="number"
              value={String(draft.primaryLanding.elevationM)}
              onChange={(value) => updateLandingField("elevationM", Number(value))}
            />
            <Field
              label="랜딩장 위도"
              type="number"
              step="0.000001"
              value={String(draft.primaryLanding.lat)}
              onChange={(value) => updateLandingField("lat", Number(value))}
            />
            <Field
              label="랜딩장 경도"
              type="number"
              step="0.000001"
              value={String(draft.primaryLanding.lng)}
              onChange={(value) => updateLandingField("lng", Number(value))}
            />
          </div>
        </section>

        <section className="glass rounded-[28px] border p-5">
          <p className="text-sm font-semibold text-stone-500">기상 기준</p>
          <div className="mt-4 grid gap-4">
            <WindSectorPicker
              title="이륙장 풍향 입력"
              description="위 그림처럼 섹터를 클릭해서 풍향을 채웁니다. 먼저 아래 등급 버튼을 고른 뒤 방향을 클릭하면 해당 풍향이 배정됩니다."
              value={draft.preferredWind}
              mode="interactive"
              activeBucket={activeWindBucket}
              onActiveBucketChange={setActiveWindBucket}
              onChange={updatePreferredWind}
            />
            <WindSectorPicker
              title="실제 표시 예시"
              description="같은 컴포넌트를 읽기 전용으로 써서, 나중에 활공장 상세 정보나 브리핑 화면에서 그대로 재사용할 수 있습니다."
              value={draft.preferredWind}
              mode="readonly"
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label="지상풍 good 범위"
              value={`${draft.windThresholds.surfaceKmh.good[0]} - ${draft.windThresholds.surfaceKmh.good[1]} km/h`}
              onChange={() => {}}
              disabled
              description="현재는 등록 초안용 고정값. 다음 단계에서 상세 편집 확장"
            />
            <Field
              label="써멀 good 범위"
              value={`${draft.thermalThresholds.good[0]} - ${draft.thermalThresholds.good[1]} m/s`}
              onChange={() => {}}
              disabled
            />
            <Field
              label="베이스 good 범위"
              value={`${draft.baseThresholdsM.good[0]} - ${draft.baseThresholdsM.good[1]} m`}
              onChange={() => {}}
              disabled
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Toggle
              label="해풍 민감"
              checked={draft.riskProfile.seaBreezeSensitive}
              onChange={(value) => updateRiskField("seaBreezeSensitive", value)}
            />
            <Toggle
              label="풍향 전환 민감"
              checked={draft.riskProfile.windShiftSensitive}
              onChange={(value) => updateRiskField("windShiftSensitive", value)}
            />
            <Toggle
              label="계곡 횡단 민감"
              checked={draft.riskProfile.valleyCrossSensitive}
              onChange={(value) => updateRiskField("valleyCrossSensitive", value)}
            />
            <Toggle
              label="늦은 출발 페널티"
              checked={draft.riskProfile.lateStartPenalty}
              onChange={(value) => updateRiskField("lateStartPenalty", value)}
            />
          </div>
        </section>

        <section className="glass rounded-[28px] border p-5">
          <p className="text-sm font-semibold text-stone-500">웨이포인트 / 운영 메모</p>
          {uploadEndpoint ? (
            <div className="mt-4 rounded-[24px] bg-stone-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-700">
                    웨이포인트 파일 업로드
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    `WPT`, `CUP`, `GPX`, `KML`, `CSV` 파일을 업로드하면 파일명이
                    자동 반영됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleWaypointUpload();
                  }}
                  disabled={!selectedWaypointFile || uploadState === "uploading"}
                  className="btn btn-primary disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {uploadState === "uploading" ? "업로드 중..." : "파일 업로드"}
                </button>
              </div>
              <div className="mt-3">
                <input
                  type="file"
                  accept=".wpt,.cup,.gpx,.kml,.csv"
                  onChange={(event) =>
                    setSelectedWaypointFile(event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-sm text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-stone-700"
                />
              </div>
              {selectedWaypointFile ? (
                <p className="mt-3 text-sm font-medium text-stone-700">
                  선택 파일: {selectedWaypointFile.name}
                </p>
              ) : null}
              {uploadMessage ? (
                <p
                  className={`mt-3 text-sm font-medium ${
                    uploadState === "error" ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {uploadMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label="웨이포인트 파일명"
              value={draft.waypointUpload.fileName}
              onChange={(value) => updateWaypointUploadField("fileName", value)}
            />
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">파일 형식</span>
              <select
                value={draft.waypointUpload.fileType}
                onChange={(event) =>
                  updateWaypointUploadField("fileType", event.target.value)
                }
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400"
              >
                <option value="wpt">WPT</option>
                <option value="cup">CUP</option>
                <option value="gpx">GPX</option>
                <option value="kml">KML</option>
                <option value="csv">CSV</option>
              </select>
            </label>
          </div>
          <div className="mt-4 space-y-4">
            <TextArea
              label="병목 구간 메모"
              value={draft.routeNotes.bottleneckNotes}
              onChange={(value) => updateRouteNoteField("bottleneckNotes", value)}
            />
            <TextArea
              label="회수 메모"
              value={draft.routeNotes.retrieveNotes}
              onChange={(value) => updateRouteNoteField("retrieveNotes", value)}
            />
            <TextArea
              label="운영 메모"
              value={draft.routeNotes.operationsNotes}
              onChange={(value) => updateRouteNoteField("operationsNotes", value)}
            />
          </div>
        </section>
      </div>

      <div className="min-w-0 space-y-6">
        {saveEndpoint ? (
          <section className="glass min-w-0 rounded-[28px] border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-500">저장</p>
                <p className="mt-1 text-sm text-stone-600">
                  이 페이지에서 수정한 값은 관리용 저장 파일에 반영됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                disabled={saveState === "saving"}
                className="btn btn-primary max-w-full whitespace-normal px-4 text-center leading-5 disabled:cursor-wait disabled:bg-stone-400"
              >
                {saveState === "saving" ? "저장 중..." : saveButtonLabel}
              </button>
            </div>
            {saveMessage ? (
              <p
                className={`mt-3 text-sm font-medium ${
                  saveState === "error" ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {saveMessage}
              </p>
            ) : null}
          </section>
        ) : null}

        <SiteRegistrationMapPreview
          launch={draft.launch}
          landing={draft.primaryLanding}
          activeTarget={activeMapTarget}
          onPickLocation={handleMapPick}
        />

        <section className="glass min-w-0 rounded-[28px] border p-5">
          <p className="text-sm font-semibold text-stone-500">저장 전 JSON 미리보기</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            지금 입력한 신규 활공장 초안이 실제 데이터 구조로 어떻게 들어가는지
            바로 확인할 수 있습니다.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-[24px] bg-stone-950 p-4 text-xs leading-6 text-stone-100">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  step?: string;
  description?: string;
  disabled?: boolean;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  description,
  disabled = false,
}: FieldProps) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400 disabled:bg-stone-100 disabled:text-stone-500"
      />
      {description ? (
        <p className="text-xs leading-5 text-stone-500">{description}</p>
      ) : null}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-stone-400"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-stone-300 text-stone-900"
      />
    </label>
  );
}
