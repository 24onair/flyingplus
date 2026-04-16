import { PersonalTasksPage } from "@/components/tasks/personal-tasks-page";
import { OpenTopLink } from "@/components/tasks/open-top-link";
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
        <div className="glass rounded-[24px] border p-4">
          <p className="text-sm font-semibold text-stone-500">워드프레스 임베드</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Task Library</h1>
          <p className="mt-2 text-sm text-stone-600">
            공개 타스크를 보고 상세 화면으로 이동할 수 있습니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={withEmbedParam("/tasks/new", embed)} className="btn btn-primary">
              신규 타스크 만들기
            </Link>
            <OpenTopLink href="/tasks/new" className="btn btn-secondary md:hidden">
              전체 화면으로 열기
            </OpenTopLink>
          </div>
        </div>
      ) : (
        <div className="glass rounded-[28px] border p-5">
          <p className="text-sm font-semibold text-stone-500">저장된 타스크</p>
          <h1 className="mt-1 text-3xl font-bold text-stone-900">Task Library</h1>
          <p className="mt-2 text-sm text-stone-600">
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
