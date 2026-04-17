import type { Metadata } from "next";
import { Suspense } from "react";
import "@/app/globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppHeader } from "@/components/layout/app-header";
import { EmbedModeSync } from "@/components/layout/embed-mode-sync";

export const metadata: Metadata = {
  title: "XC Planner | Hike & Fly",
  description: "브리핑, 비교, 코스 제작, 타스크 공유, 활공장 관리까지 이어지는 Hike & Fly XC Planner입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <div className="app-shell">
            <Suspense fallback={null}>
              <EmbedModeSync />
              <AppHeader />
            </Suspense>
            <main className="page-wrap">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
