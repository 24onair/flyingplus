"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AuthStatus } from "@/components/auth/auth-status";
import { useAuth } from "@/components/auth/auth-provider";

const primaryNavItems = [
  { href: "/", label: "홈" },
  { href: "/briefing", label: "브리핑" },
  { href: "/compare", label: "비교" },
  { href: "/courses", label: "코스" },
  { href: "/tasks", label: "타스크" },
];

const utilityNavItems = [
  {
    href: "/experiments/igc-dashboard/list.html",
    label: "IGC 로그",
  },
  {
    href: "/sites/catalog",
    label: "활공장 목록",
    activePrefixes: ["/sites/catalog"],
  },
  {
    href: "/sites",
    label: "활공장 관리",
    activePrefixes: ["/sites", "/sites/new"],
  },
];

function isItemActive(
  pathname: string,
  href: string,
  activePrefixes?: string[]
) {
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(`${href}/`)) return true;
  return activePrefixes?.some((prefix) => pathname.startsWith(prefix)) ?? false;
}

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";
  const isMapFullscreen = searchParams.get("mapFullscreen") === "1";
  const isProfileFullscreen = searchParams.get("profileFullscreen") === "1";
  const serializedParams = searchParams.toString();
  const { profile } = useAuth();

  const utilityItems = utilityNavItems
    .filter((item) => (item.href === "/sites/catalog" ? profile?.isAdmin : true))
    .map((item) =>
      item.href === "/sites"
        ? { ...item, label: profile?.isAdmin ? "활공장 관리" : "활공장" }
        : item
    );

  if (isEmbed || isMapFullscreen || isProfileFullscreen) return null;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "#000000",
        borderBottom: "1px solid #1f1f1f",
        boxShadow: "rgba(0,0,0,0.3) 0px 0px 5px 0px",
      }}
    >
      <div
        className="header-inner"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 32px",
          minHeight: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 4,
              border: "1px solid #0ea5e9",
              background: "#111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" fill="#0ea5e9" opacity="0.92"/>
              <path d="M12 6l-4 2.5v5L12 16l4-2.5v-5L12 6z" fill="#ffffff"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#a7a7a7", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1 }}>
              XC Planner
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", lineHeight: 1.2, marginTop: 2 }}>
              Hike &amp; Fly
            </p>
          </div>
        </Link>

        {/* Primary Nav */}
        <nav className="header-primary-nav" style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, justifyContent: "center", overflow: "auto" }}>
          {primaryNavItems.map((item) => {
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={serializedParams ? `${item.href}?${serializedParams}` : item.href}
                style={{
                  padding: "6px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 4,
                  textTransform: "uppercase",
                  color: active ? "#ffffff" : "#a7a7a7",
                  background: active ? "rgba(14,165,233,0.08)" : "transparent",
                  borderBottom: active ? "2px solid #0ea5e9" : "2px solid transparent",
                  transition: "all 200ms ease",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Utility + Auth */}
        <div className="header-right" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {utilityItems.map((item) => {
              const active = isItemActive(pathname, item.href, item.activePrefixes);
              return (
                <Link
                  key={item.href}
                  href={serializedParams ? `${item.href}?${serializedParams}` : item.href}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 4,
                    textTransform: "uppercase",
                    color: active ? "#0ea5e9" : "#898989",
                    background: active ? "rgba(14,165,233,0.08)" : "transparent",
                    border: active ? "1px solid rgba(14,165,233,0.45)" : "1px solid transparent",
                    transition: "all 200ms ease",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <AuthStatus />
        </div>
      </div>

      {/* Mobile nav */}
      <style>{`
        @media (max-width: 768px) {
          .header-inner { flex-wrap: wrap; height: auto !important; padding: 12px 16px !important; }
          .header-primary-nav { order: 3; width: 100%; justify-content: flex-start !important; overflow-x: auto; padding-bottom: 4px; }
          .header-right { order: 2; }
        }
      `}</style>
    </header>
  );
}
