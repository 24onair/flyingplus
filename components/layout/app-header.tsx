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

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-[rgba(248,244,236,0.8)] backdrop-blur-xl">
      <div className="mx-auto flex w-[min(1200px,calc(100vw-24px))] items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-xl text-white">
            🪂
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-500">XC 도우미</p>
            <p className="text-base font-bold text-stone-900">
              Hike & Fly Planner
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <div className="flex flex-col items-end gap-2">
            <nav className="flex flex-wrap justify-end gap-2">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={
                    serializedParams ? `${item.href}?${serializedParams}` : item.href
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-white hover:text-stone-900 ${
                    isItemActive(pathname, item.href)
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <nav className="flex flex-wrap justify-end gap-2">
                {utilityItems.map((item) => (
                  <Link
                    key={item.href}
                    href={
                      serializedParams ? `${item.href}?${serializedParams}` : item.href
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isItemActive(pathname, item.href, item.activePrefixes)
                        ? "border-stone-300 bg-white text-stone-900 shadow-sm"
                        : "border-stone-200 bg-stone-50/80 text-stone-600 hover:border-stone-300 hover:bg-white hover:text-stone-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <AuthStatus />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
