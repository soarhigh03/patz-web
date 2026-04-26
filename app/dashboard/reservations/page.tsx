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
    .select("id, handle, name")
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as { id: string; handle: string; name: string } | null;

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

  const reservations = await listShopReservations(shop.id, shop.handle);

  return (
    <main className="min-h-dvh px-6 pt-12 pb-10">
      <BackLink />
      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">예약 관리</h1>
        <p className="mt-1 text-sm text-muted">
          {shop.name} · 확정된 예약 {reservations.length}건
        </p>
      </header>

      <section className="mt-8">
        <ReservationTimetable reservations={reservations} />
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
