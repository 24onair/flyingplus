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
  if (pathname === href) {
    return true;
  }

  if (href !== "/" && pathname.startsWith(`${href}/`)) {
    return true;
  }

  return activePrefixes?.some((prefix) => pathname.startsWith(prefix)) ?? false;
}

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";
  const serializedParams = searchParams.toString();
  const { profile } = useAuth();
  const utilityItems = utilityNavItems
    .filter((item) => (item.href === "/sites/catalog" ? profile?.isAdmin : true))
    .map((item) =>
      item.href === "/sites"
        ? {
            ...item,
            label: profile?.isAdmin ? "활공장 관리" : "활공장",
          }
        : item
    );

  if (isEmbed) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-[rgba(248,244,236,0.8)] backdrop-blur-xl">
      <div className="mx-auto w-[min(1200px,calc(100vw-24px))] py-3 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-xl text-white">
            🪂
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-500">XC 도우미</p>
              <p className="truncate text-base font-bold text-stone-900 md:text-lg">
                Hike & Fly Planner
              </p>
            </div>
          </Link>

          <div className="min-w-0 flex-1 space-y-2">
            <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-end md:overflow-visible md:pb-0">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={
                    serializedParams ? `${item.href}?${serializedParams}` : item.href
                  }
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-white hover:text-stone-900 ${
                    isItemActive(pathname, item.href)
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
              <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-end md:overflow-visible md:pb-0">
                {utilityItems.map((item) => (
                  <Link
                    key={item.href}
                    href={
                      serializedParams ? `${item.href}?${serializedParams}` : item.href
                    }
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isItemActive(pathname, item.href, item.activePrefixes)
                        ? "border-stone-300 bg-white text-stone-900 shadow-sm"
                        : "border-stone-200 bg-stone-50/80 text-stone-600 hover:border-stone-300 hover:bg-white hover:text-stone-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="min-w-0 md:max-w-full">
                <AuthStatus />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
