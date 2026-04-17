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
      <section
        style={{
          background: "#050505",
          borderRadius: 4,
          padding: "32px 32px",
          border: "1px solid #1f1f1f",
          boxShadow: "rgba(0,0,0,0.3) 0px 0px 5px 0px",
        }}
      >
        <span style={{
          display: "inline-flex",
          padding: "4px 12px",
          borderRadius: 2,
          fontSize: 11,
          fontWeight: 700,
          background: "rgba(14,165,233,0.12)",
          color: "#0EA5E9",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}>
          로그인
        </span>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#FFFFFF", margin: "0 0 12px", lineHeight: 1.2 }}>
          승인된 회원은<br />
          개인 저장 기능을 사용할 수 있습니다.
        </h1>
        <p style={{ fontSize: 15, color: "#A7A7A7", margin: "0 0 24px", lineHeight: 1.65 }}>
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

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #5E5E5E",
          borderRadius: 4,
          padding: 32,
          boxShadow: "rgba(0,0,0,0.3) 0px 0px 5px 0px",
        }}
      >
        {!supabaseEnabled ? (
          <div style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: 4,
            fontSize: 14,
            background: "rgba(229,32,32,0.08)",
            border: "1px solid rgba(229,32,32,0.35)",
            color: "#E52020",
          }}>
            Supabase 환경 변수가 아직 설정되지 않았습니다. `.env.local` 설정을 먼저 확인해 주세요.
          </div>
        ) : null}
        <LoginForm supabaseEnabled={supabaseEnabled} nextPath={nextPath} />
      </section>

    </div>
  );
}
