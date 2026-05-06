"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  shop: { handle: string; name: string } | null;
  userEmail: string;
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV: readonly NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/requests", label: "예약 요청", icon: Bell },
  { href: "/dashboard/reservations", label: "예약 관리", icon: CalendarDays },
  { href: "/dashboard/arts", label: "아트 관리", icon: Images },
  { href: "/dashboard/shop", label: "샵 정보", icon: Store },
];

/**
 * PC-only sidebar (>= lg). Below lg the dashboard pages keep their
 * existing mobile drill-down with ChevronLeft back links.
 */
export function DashboardSidebar({ shop, userEmail }: Props) {
  const pathname = usePathname() ?? "";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
      <div className="px-6 pt-8">
        <Link href="/dashboard" className="block">
          <Image
            src="/logo/grad-sym-letter.png"
            alt="PATZ"
            width={96}
            height={36}
            priority
            className="h-9 w-auto"
          />
        </Link>
        {shop ? (
          <div className="mt-4">
            <p className="truncate text-sm font-medium">{shop.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">@{shop.handle}</p>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">샵 정보 없음</p>
        )}
      </div>

      <nav className="mt-8 flex-1 px-3">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-ink text-white"
                      : "text-ink/80 hover:bg-neutral-100",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {shop && (
          <div className="mt-6 border-t border-line pt-3">
            <Link
              href={`/shops/${shop.handle}`}
              target="_blank"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-neutral-100"
            >
              <ExternalLink size={14} />
              공개 페이지 보기
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-line px-4 py-4">
        <p className="truncate text-xs text-muted" title={userEmail}>
          {userEmail || "—"}
        </p>
        <form action="/auth/signout" method="POST" className="mt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
          >
            <LogOut size={12} />
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
