import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { getManageSiteList } from "@/lib/sites/runtime-site-configs";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const sites = await getManageSiteList();
  const supabaseEnabled = hasSupabaseAdminEnv();

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
            회원가입
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              승인된 회원만
              <br />
              개인 저장 기능을 사용할 수 있습니다.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              비회원도 코스 생성과 내보내기는 가능하지만, 개인 타스크 저장과 좋아하는 활공장 저장은 승인된 회원에게만 열립니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/courses" className="btn btn-secondary">
              비회원으로 코스 만들기
            </Link>
          </div>
        </div>
      </section>

      <section className="glass rounded-[32px] border px-6 py-8 md:px-8">
        {!supabaseEnabled ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
            Supabase 관리자 환경 변수가 아직 설정되지 않았습니다. `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY` 설정을 먼저 확인해 주세요.
          </div>
        ) : null}

        <SignupForm
          siteOptions={sites.map((site) => ({
            siteId: site.siteId,
            siteName: site.siteName,
          }))}
          supabaseEnabled={supabaseEnabled}
        />
      </section>
    </div>
  );
}
