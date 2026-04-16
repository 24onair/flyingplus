import { PersonalTaskDetailPage } from "@/components/tasks/personal-task-detail-page";
import { isEmbedValue } from "@/lib/embed";

export const dynamic = "force-dynamic";

export default async function SavedTaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { taskId } = await params;
  const resolvedSearchParams = await searchParams;
  const normalizedTaskId = decodeURIComponent(taskId);
  return (
    <PersonalTaskDetailPage
      taskId={normalizedTaskId}
      embed={isEmbedValue(resolvedSearchParams.embed)}
      autoOpenMapFullscreen={isEmbedValue(resolvedSearchParams.mapFullscreen)}
      autoOpenProfileFullscreen={isEmbedValue(resolvedSearchParams.profileFullscreen)}
    />
  );
}
