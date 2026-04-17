import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { isEmbedValue, withEmbedParam, withNextParam } from "@/lib/embed";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabaseEnabled = hasSupabasePublicEnv();
  const resolvedSearchParams = await searchParams;
  const embed = isEmbedValue(resolvedSearchParams.embed);
  const nextValue = Array.isArray(resolvedSearchParams.next)
    ? resolvedSearchParams.next[0]
    : resolvedSearchParams.next;
  const defaultNextPath = withEmbedParam("/tasks/new", embed);
  const nextPath =
    typeof nextValue === "string" && nextValue.startsWith("/") && !nextValue.startsWith("//")
      ? nextValue
      : defaultNextPath;
  const signupHref = withNextParam(withEmbedParam("/auth/signup", embed), nextPath);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 560, margin: "0 auto" }}>
      <section className="theme-hero">
        <span className="theme-badge" style={{ marginBottom: 16 }}>
          로그인
        </span>
        <h1 className="theme-title" style={{ fontSize: 30, margin: "0 0 12px" }}>
          승인된 회원은<br />
          개인 저장 기능을 사용할 수 있습니다.
        </h1>
        <p className="theme-copy theme-copy-inverse" style={{ margin: "0 0 24px" }}>
          로그인 후 승인 상태가 확인되면 개인 타스크 저장과 좋아하는 활공장 저장 기능을 사용할 수 있습니다.
        </p>
        <Link
          href={signupHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 40,
            padding: "0 20px",
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 700,
            background: "transparent",
            color: "#FFFFFF",
            border: "2px solid #0EA5E9",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          회원가입으로 이동
        </Link>
      </section>

      <section className="theme-panel" style={{ padding: 32 }}>
        {!supabaseEnabled ? (
          <div className="theme-error" style={{ marginBottom: 20, fontSize: 14 }}>
            Supabase 환경 변수가 아직 설정되지 않았습니다. `.env.local` 설정을 먼저 확인해 주세요.
          </div>
        ) : null}
        <LoginForm supabaseEnabled={supabaseEnabled} nextPath={nextPath} />
      </section>

    </div>
  );
}
