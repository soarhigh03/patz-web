import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ShopForm, type ShopFormInitial } from "@/components/ShopForm";

export default async function ShopFormPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !(profile as { onboarded_at: string | null }).onboarded_at) {
    redirect("/onboarding");
  }

  // Every column the form reads back. `*` would work but enumerating keeps
  // the form ↔ schema mapping visible.
  const { data: shopRow } = await supabase
    .from("shops")
    .select(
      "id, handle, name, phone, address, latitude, longitude, hours_open, hours_close, hours_break_start, hours_break_end, closed_weekdays, hours_note, caution_note, parking_info, map_badge, account_bank, account_number, deposit_amount, profile_image_path, background_image_path",
    )
    .eq("owner_id", user.id)
    .maybeSingle();

  const mode: "create" | "edit" = shopRow ? "edit" : "create";
  const row = shopRow as unknown as ShopRow | null;
  const initial = row ? rowToInitial(row) : EMPTY_INITIAL;
  const profileImageUrl = row ? storageUrl(row.profile_image_path) : undefined;
  const backgroundImageUrl = row
    ? storageUrl(row.background_image_path)
    : undefined;

  return (
    <main className="min-h-dvh px-6 pt-12 pb-16">
      <Link
        href="/dashboard"
        className="-ml-1 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ChevronLeft size={16} />
        대시보드
      </Link>
      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "create" ? "샵 만들기" : "샵 정보 수정"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "create"
            ? "공개 샵 페이지에서 표시될 정보를 입력해주세요."
            : "변경 후 ‘저장’을 눌러야 적용돼요."}
        </p>
      </header>
      <ShopForm
        initial={initial}
        mode={mode}
        shopId={row?.id}
        profileImageUrl={profileImageUrl}
        backgroundImageUrl={backgroundImageUrl}
      />
    </main>
  );
}

function storageUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shop-assets/${path}`;
}

interface ShopRow {
  id: string;
  handle: string;
  name: string;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  hours_open: string | null;
  hours_close: string | null;
  hours_break_start: string | null;
  hours_break_end: string | null;
  closed_weekdays: number[] | null;
  hours_note: string | null;
  caution_note: string | null;
  parking_info: string | null;
  map_badge: string | null;
  account_bank: string | null;
  account_number: string | null;
  deposit_amount: number | null;
  profile_image_path: string | null;
  background_image_path: string | null;
}

function rowToInitial(r: ShopRow): ShopFormInitial {
  return {
    handle: r.handle,
    name: r.name,
    phone: r.phone,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    // Postgres `time` serializes as "HH:MM:SS"; the form's <input type="time">
    // expects "HH:mm".
    hoursOpen: trimSeconds(r.hours_open),
    hoursClose: trimSeconds(r.hours_close),
    hoursBreakStart: trimSeconds(r.hours_break_start),
    hoursBreakEnd: trimSeconds(r.hours_break_end),
    closedWeekdays: r.closed_weekdays ?? [],
    hoursNote: r.hours_note,
    cautionNote: r.caution_note,
    parkingInfo: r.parking_info,
    mapBadge: r.map_badge,
    accountBank: r.account_bank,
    accountNumber: r.account_number,
    depositAmount: r.deposit_amount,
  };
}

function trimSeconds(t: string | null): string | null {
  if (!t) return null;
  return t.length >= 5 ? t.slice(0, 5) : t;
}

const EMPTY_INITIAL: ShopFormInitial = {
  handle: "",
  name: "",
  phone: null,
  address: null,
  latitude: null,
  longitude: null,
  hoursOpen: null,
  hoursClose: null,
  hoursBreakStart: null,
  hoursBreakEnd: null,
  closedWeekdays: [],
  hoursNote: null,
  cautionNote: null,
  parkingInfo: null,
  mapBadge: null,
  accountBank: null,
  accountNumber: null,
  depositAmount: null,
};
