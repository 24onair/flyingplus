import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const supabaseEnabled = hasSupabasePublicEnv();

  return (
    <div className="space-y-6">
      <section className="glass overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
            로그인
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              승인된 회원은
              <br />
              개인 저장 기능을 사용할 수 있습니다.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-stone-600 md:text-lg">
              로그인 후 승인 상태가 확인되면 개인 타스크 저장과 좋아하는 활공장 저장 기능을 사용할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/signup" className="btn btn-secondary">
              회원가입으로 이동
            </Link>
          </div>
        </div>
      </section>

      <section className="glass rounded-[32px] border px-6 py-8 md:px-8">
        {!supabaseEnabled ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
            Supabase 환경 변수가 아직 설정되지 않았습니다. `.env.local` 설정을 먼저 확인해 주세요.
          </div>
        ) : null}

        <LoginForm supabaseEnabled={supabaseEnabled} />
      </section>
    </div>
  );
}

