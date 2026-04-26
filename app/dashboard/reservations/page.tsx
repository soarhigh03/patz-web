import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listShopReservations } from "@/lib/data";
import { ReservationTimetable } from "@/components/ReservationTimetable";

export default async function DashboardReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shopRow } = await supabase
    .from("shops")
    .select(
      "id, handle, name, hours_open, hours_close, hours_break_start, hours_break_end",
    )
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as
    | {
        id: string;
        handle: string;
        name: string;
        hours_open: string | null;
        hours_close: string | null;
        hours_break_start: string | null;
        hours_break_end: string | null;
      }
    | null;

  if (!shop) {
    return (
      <main className="min-h-dvh px-6 pt-12 pb-10">
        <BackLink />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">예약 관리</h1>
        <div className="mt-8 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          아직 등록한 샵이 없어요.
        </div>
      </main>
    );
  }

  const reservations = await listShopReservations(shop.id, shop.handle, {
    statuses: ["pending", "confirmed"],
  });

  const pendingCount = reservations.filter((r) => r.status === "pending").length;
  const confirmedCount = reservations.length - pendingCount;

  return (
    <main className="min-h-dvh px-6 pt-12 pb-10">
      <BackLink />
      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">예약 관리</h1>
        <p className="mt-1 text-sm text-muted">
          {shop.name} · 요청 {pendingCount}건 · 확정 {confirmedCount}건
        </p>
      </header>

      <section className="mt-8">
        <ReservationTimetable
          reservations={reservations}
          shopHours={{
            open: trimSeconds(shop.hours_open) ?? "10:00",
            close: trimSeconds(shop.hours_close) ?? "20:00",
            breakStart: trimSeconds(shop.hours_break_start),
            breakEnd: trimSeconds(shop.hours_break_end),
          }}
        />
      </section>
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
    >
      <ChevronLeft size={16} />
      대시보드
    </Link>
  );
}

/** Postgres `time` serializes as "HH:MM:SS"; the timetable wants "HH:mm". */
function trimSeconds(t: string | null): string | undefined {
  if (!t) return undefined;
  return t.length >= 5 ? t.slice(0, 5) : t;
}
