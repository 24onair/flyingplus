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
      <section className="theme-hero">
        <span className="theme-badge" style={{ marginBottom: 16 }}>
          회원가입
        </span>
        <h1 className="theme-title" style={{ fontSize: 30, margin: "0 0 12px" }}>
          승인된 회원만<br />
          개인 저장 기능을 사용할 수 있습니다.
        </h1>
        <p className="theme-copy theme-copy-inverse" style={{ margin: "0 0 24px" }}>
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

      <section className="theme-panel" style={{ padding: 32 }}>
        {!supabaseEnabled ? (
          <div className="theme-error" style={{ marginBottom: 20, fontSize: 14 }}>
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
