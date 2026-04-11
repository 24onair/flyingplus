import { PersonalTaskDetailPage } from "@/components/tasks/personal-task-detail-page";

export const dynamic = "force-dynamic";

export default async function SavedTaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const normalizedTaskId = decodeURIComponent(taskId);
  return <PersonalTaskDetailPage taskId={normalizedTaskId} />;
}
