import { SavedTaskDetail } from "@/components/tasks/saved-task-detail";
import { isEmbedValue } from "@/lib/embed";
import type { SavedTaskRecord } from "@/types/saved-task";

export const dynamic = "force-dynamic";

function todayInSeoul() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const embed = isEmbedValue(resolvedSearchParams.embed);
  const autoOpenMapFullscreen = isEmbedValue(resolvedSearchParams.mapFullscreen);

  const draftTask: SavedTaskRecord = {
    id: "draft-task",
    visibility: "private",
    name: "신규 타스크",
    siteId: "manual",
    siteName: "직접 입력",
    date: todayInSeoul(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    taskType: "RACE",
    sssOpenTime: "12:00",
    taskDeadlineTime: "23:00",
    distanceKm: 0,
    turnpoints: [],
  };

  return (
    <div className={autoOpenMapFullscreen ? "space-y-0" : "space-y-6"}>
      {!autoOpenMapFullscreen ? (
        <div className={`glass border ${embed ? "rounded-[24px] p-4" : "rounded-[28px] p-5"}`}>
          <p className="text-sm font-semibold text-stone-500">신규 타스크</p>
          <h1 className={`mt-1 font-bold text-stone-900 ${embed ? "text-2xl" : "text-3xl"}`}>
            빈 지도에서 새 타스크 만들기
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            지명을 검색해 가운데로 이동한 뒤 지도를 클릭하거나, 원하는 위치에 직접 타스크 포인트를 추가해 타스크를 만들 수 있습니다.
          </p>
        </div>
      ) : null}
      <SavedTaskDetail
        task={draftTask}
        embed={embed}
        draftMode
        autoOpenMapFullscreen={autoOpenMapFullscreen}
      />
    </div>
  );
}
