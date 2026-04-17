import { PersonalTasksPage } from "@/components/tasks/personal-tasks-page";
import { isEmbedValue } from "@/lib/embed";
import Link from "next/link";
import { withEmbedParam } from "@/lib/embed";

export const dynamic = "force-dynamic";

export default async function SavedTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const embed = isEmbedValue(resolvedSearchParams.embed);

  return (
    <div className="space-y-6">
      {embed ? (
        <div className="theme-panel p-4">
          <p className="theme-kicker theme-kicker-muted">워드프레스 임베드</p>
          <h1 className="theme-subtitle mt-1 text-[color:var(--text-primary)]">Task Library</h1>
          <p className="theme-copy mt-2 text-sm">
            공개 타스크를 보고 상세 화면으로 이동할 수 있습니다.
          </p>
          <div className="mt-4">
            <Link href={withEmbedParam("/tasks/new", embed)} className="btn btn-primary">
              신규 타스크 만들기
            </Link>
          </div>
        </div>
      ) : (
        <div className="theme-hero">
          <p className="theme-kicker">저장된 타스크</p>
          <h1 className="theme-title mt-1">Task Library</h1>
          <p className="theme-copy theme-copy-inverse mt-2 text-sm">
            공개 타스크는 모두 볼 수 있고, 일반 회원은 본인 타스크만 추가로 확인할 수 있습니다.
            관리자는 전체 저장 타스크를 모두 확인할 수 있습니다.
          </p>
          <div className="mt-4">
            <Link href={withEmbedParam("/tasks/new", embed)} className="btn btn-primary">
              신규 타스크 만들기
            </Link>
          </div>
        </div>
      )}

      <PersonalTasksPage embed={embed} />
    </div>
  );
}
