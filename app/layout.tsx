import type { Metadata } from "next";
import { Suspense } from "react";
import "@/app/globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppHeader } from "@/components/layout/app-header";

export const metadata: Metadata = {
  title: "XC 도우미",
  description: "패러글라이딩 Hike & Fly XC 코스플래너 MVP",
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
              <AppHeader />
            </Suspense>
            <main className="page-wrap">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
