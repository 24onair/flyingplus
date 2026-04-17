import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { getManageSiteList } from "@/lib/sites/runtime-site-configs";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const sites = await getManageSiteList();
  const supabaseEnabled = hasSupabaseAdminEnv();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640, margin: "0 auto" }}>
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
          회원가입
        </span>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#FFFFFF", margin: "0 0 12px", lineHeight: 1.2 }}>
          승인된 회원만<br />
          개인 저장 기능을 사용할 수 있습니다.
        </h1>
        <p style={{ fontSize: 15, color: "#A7A7A7", margin: "0 0 24px", lineHeight: 1.65 }}>
          비회원도 코스 생성과 내보내기는 가능하지만, 개인 타스크 저장과 좋아하는 활공장 저장은 승인된 회원에게만 열립니다.
        </p>
        <Link
          href="/courses"
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
          비회원으로 코스 만들기
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
            Supabase 관리자 환경 변수가 아직 설정되지 않았습니다. `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY` 설정을 먼저 확인해 주세요.
          </div>
        ) : null}
        <SignupForm
          siteOptions={sites.map((site) => ({ siteId: site.siteId, siteName: site.siteName }))}
          supabaseEnabled={supabaseEnabled}
        />
      </section>

    </div>
  );
}
