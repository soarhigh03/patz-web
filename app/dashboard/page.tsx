import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  Images,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listShopReservations } from "@/lib/data";
import { formatDurationKR } from "@/lib/format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, phone, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !(profile as { onboarded_at: string | null }).onboarded_at) {
    redirect("/onboarding");
  }

  const p = profile as { nickname: string; phone: string };

  const { data: shopRow } = await supabase
    .from("shops")
    .select("id, handle, name")
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as { id: string; handle: string; name: string } | null;

  // No-shop state: show the same prompt on both mobile and PC.
  if (!shop) {
    return (
      <main className="min-h-dvh px-6 pt-12 pb-10 lg:pt-12">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
          <p className="mt-1 text-sm text-muted">{p.nickname} 님 환영합니다.</p>
        </header>
        <div className="mt-10 rounded-xl border border-dashed border-line p-8 text-center">
          <p className="text-sm text-muted">아직 등록한 샵이 없어요.</p>
          <Link
            href="/dashboard/shop"
            className="mt-4 inline-block rounded-full border border-line px-4 py-1.5 text-sm hover:bg-neutral-50"
          >
            샵 만들기
          </Link>
        </div>
      </main>
    );
  }

  const today = todayKST();

  const [reservations, artsCount] = await Promise.all([
    listShopReservations(shop.id, shop.handle, {
      statuses: ["pending", "confirmed"],
      fromDate: today,
    }),
    supabase
      .from("arts")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .is("archived_at", null),
  ]);

  const todayItems = reservations.filter((r) => r.reservationDate === today);
  const todayConfirmed = todayItems.filter((r) => r.status === "confirmed").length;
  const todayPending = todayItems.filter((r) => r.status === "pending").length;
  const weekEnd = shiftDate(today, 7);
  const weekConfirmed = reservations.filter(
    (r) => r.status === "confirmed" && r.reservationDate < weekEnd,
  ).length;
  const totalArts = artsCount.count ?? 0;

  return (
    <main className="min-h-dvh px-6 pt-12 pb-10 lg:pt-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        <p className="mt-1 text-sm text-muted">{p.nickname} 님 환영합니다.</p>
      </header>

      {/* Mobile-only nav cards (PC uses the sidebar). */}
      <section className="mt-10 lg:hidden">
        <h2 className="text-sm font-medium text-muted">내 샵</h2>
        <div className="mt-3 rounded-xl border border-line p-4">
          <p className="text-base font-medium">{shop.name}</p>
          <p className="mt-0.5 text-xs text-muted">@{shop.handle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/shops/${shop.handle}`}
              className="rounded-full border border-line px-4 py-1.5 text-sm hover:bg-neutral-50"
            >
              공개 페이지 보기
            </Link>
            <Link
              href="/dashboard/shop"
              className="rounded-full border border-line px-4 py-1.5 text-sm hover:bg-neutral-50"
            >
              샵 정보 수정
            </Link>
            <Link
              href="/dashboard/arts"
              className="rounded-full border border-line px-4 py-1.5 text-sm hover:bg-neutral-50"
            >
              아트 관리
            </Link>
            <Link
              href="/dashboard/reservations"
              className="rounded-full border border-line px-4 py-1.5 text-sm hover:bg-neutral-50"
            >
              예약 관리
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 lg:hidden">
        <h2 className="text-sm font-medium text-muted">계정</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row term="이메일" value={user.email ?? "—"} />
          <Row term="전화번호" value={formatPhone(p.phone)} />
        </dl>
        <form action="/auth/signout" method="POST" className="mt-8">
          <button
            type="submit"
            className="text-sm text-muted underline hover:text-ink"
          >
            로그아웃
          </button>
        </form>
      </section>

      {/* PC summary */}
      <section className="mt-8 hidden lg:block">
        <div className="grid grid-cols-4 gap-4">
          <Stat
            label="오늘 확정"
            value={todayConfirmed}
            unit="건"
            icon={<CalendarCheck size={18} />}
          />
          <Stat
            label="오늘 요청"
            value={todayPending}
            unit="건"
            tone={todayPending > 0 ? "warn" : "default"}
            icon={<Sparkles size={18} />}
          />
          <Stat
            label="이번 주 확정"
            value={weekConfirmed}
            unit="건"
            icon={<CalendarClock size={18} />}
          />
          <Stat
            label="등록된 아트"
            value={totalArts}
            unit="개"
            icon={<Images size={18} />}
          />
        </div>

        <div className="mt-8 grid grid-cols-3 gap-6">
          <div className="col-span-2 rounded-2xl border border-line bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">오늘의 예약</h2>
              <Link
                href="/dashboard/reservations"
                className="inline-flex items-center gap-0.5 text-xs text-muted hover:text-ink"
              >
                예약 관리
                <ChevronRight size={12} />
              </Link>
            </div>
            {todayItems.length === 0 ? (
              <p className="mt-8 text-center text-sm text-muted">
                오늘 잡힌 예약이 없어요.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {todayItems.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <span className="w-14 shrink-0 text-sm tabular-nums text-muted">
                      {r.reservationTime}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {r.customerName}
                        <span className="ml-1.5 text-xs font-normal text-muted">
                          {formatDurationKR(r.durationMinutes)}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted">
                        {r.serviceCategoryName} · {r.artName}
                      </p>
                    </div>
                    {r.status === "pending" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                        요청
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-white p-6">
            <h2 className="text-sm font-medium">바로가기</h2>
            <div className="mt-4 space-y-2">
              <QuickLink href={`/shops/${shop.handle}`} external>
                공개 페이지 보기
              </QuickLink>
              <QuickLink href="/dashboard/arts/new">새 아트 등록</QuickLink>
              <QuickLink href="/dashboard/shop">샵 정보 수정</QuickLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  unit,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={
        "rounded-2xl border p-5 " +
        (tone === "warn"
          ? "border-amber-200 bg-amber-50"
          : "border-line bg-white")
      }
    >
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs">{label}</span>
        <span className={tone === "warn" ? "text-amber-700" : ""}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
      </p>
    </div>
  );
}

function QuickLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm transition hover:bg-neutral-50"
    >
      {children}
      <ChevronRight size={14} className="text-muted" />
    </Link>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatPhone(digits: string): string {
  if (!digits || digits.length < 10) return digits;
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function todayKST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function shiftDate(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
