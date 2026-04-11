import { AdminMembersPage } from "@/components/auth/admin-members-page";

export const dynamic = "force-dynamic";

export default function AdminMembersRoute() {
  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">
            관리자 회원 승인
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              회원 승인과 관리자 권한을
              <br />
              한 곳에서 관리합니다.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              가입 대기 회원을 승인하거나 반려하고, 필요하면 관리자 권한도 바로 조정할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <AdminMembersPage />
    </div>
  );
}
