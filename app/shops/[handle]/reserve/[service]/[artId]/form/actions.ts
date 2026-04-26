"use server";

import { createClient } from "@/lib/supabase/server";
import { computeReservationDuration } from "@/lib/duration";

export interface SubmitReservationInput {
  shopHandle: string;
  serviceCode: string;
  artCode: string;
  customerName: string;
  /** "010xxxxxxxx" (10 or 11 digits, no dashes). */
  customerPhone: string;
  /** null = "상관없음". */
  staffId: string | null;
  /** YYYY-MM-DD (KST). */
  reservationDate: string;
  /** "HH:mm". */
  reservationTime: string;
  gelSelfRemoval: boolean;
  gelOtherRemoval: boolean;
  extensionCount: number;
  notes: string | null;
}

export type SubmitReservationResult =
  | { ok: true; reservationId: string }
  | { ok: false; error: string };

/**
 * Insert a `pending` reservation. Anonymous (anon-key) callers are allowed by
 * RLS; the `customer_user_id` is filled when the customer happens to be
 * signed in (mobile flow), otherwise NULL (web).
 *
 * Snapshots `art_name`, `total_price`, `duration_minutes`, and
 * `deposit_amount` at insert so historical reservations survive art renames /
 * price changes / soft-delete.
 *
 * NOTE: photo upload (reservation-photos bucket) is NOT wired here yet — the
 * storage write policy needs domain checks for anonymous uploads. The form
 * file picker is preview-only for now; real uploads come in a follow-up.
 */
export async function submitReservation(
  input: SubmitReservationInput,
): Promise<SubmitReservationResult> {
  const supabase = await createClient();

  // Phone — matches the DB CHECK `^010[0-9]{7,8}$`.
  if (!/^010\d{7,8}$/.test(input.customerPhone)) {
    return { ok: false, error: "전화번호 형식이 올바르지 않아요." };
  }
  if (!input.customerName.trim()) {
    return { ok: false, error: "이름을 입력해주세요." };
  }

  const { data: shopData } = await supabase
    .from("shops")
    .select("id, deposit_amount")
    .eq("handle", input.shopHandle)
    .is("archived_at", null)
    .maybeSingle();
  const shop = shopData as { id: string; deposit_amount: number | null } | null;
  if (!shop) return { ok: false, error: "샵을 찾을 수 없어요." };

  const { data: catData } = await supabase
    .from("service_categories")
    .select("id")
    .eq("shop_id", shop.id)
    .eq("code", input.serviceCode)
    .is("archived_at", null)
    .maybeSingle();
  const cat = catData as { id: string } | null;
  if (!cat) return { ok: false, error: "서비스 카테고리를 찾을 수 없어요." };

  const { data: artData } = await supabase
    .from("arts")
    .select("id, name, price")
    .eq("shop_id", shop.id)
    .eq("code", input.artCode)
    .is("archived_at", null)
    .maybeSingle();
  const art = artData as
    | { id: string; name: string; price: number }
    | null;
  if (!art) return { ok: false, error: "아트를 찾을 수 없어요." };

  // Duration is computed (not pulled from arts.duration_minutes) so it
  // accounts for 제거 / 연장 options the customer just picked. Stored as a
  // snapshot on the reservation so future option-rule changes don't shift
  // historical bookings.
  const durationMinutes = computeReservationDuration({
    serviceCode: input.serviceCode,
    hasRemoval: input.gelOtherRemoval || input.gelSelfRemoval,
    hasExtension: input.extensionCount > 0,
  });

  // For mobile (logged-in) bookings, link the row to the user; web is anon.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error: insertErr } = await supabase
    .from("reservations")
    .insert({
      shop_id: shop.id,
      service_category_id: cat.id,
      art_id: art.id,
      staff_id: input.staffId,
      customer_user_id: user?.id ?? null,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone,
      reservation_date: input.reservationDate,
      reservation_time: input.reservationTime,
      duration_minutes: durationMinutes,
      gel_self_removal: input.gelSelfRemoval,
      gel_other_removal: input.gelOtherRemoval,
      extension_count: input.extensionCount,
      notes: input.notes?.trim() || null,
      art_name: art.name,
      total_price: art.price,
      deposit_amount: shop.deposit_amount ?? 0,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "예약 요청을 저장하지 못했어요.",
    };
  }

  return { ok: true, reservationId: (inserted as { id: string }).id };
}

export interface BusyInterval {
  /** Minutes-of-day at appointment start. */
  start: number;
  /** Minutes-of-day at appointment end (exclusive). */
  end: number;
}

/**
 * Returns busy windows for the (shop, date) — both pending and confirmed
 * reservations. Customer-facing: the `get_busy_intervals` RPC bypasses RLS
 * but only exposes minutes-of-day (no PII).
 */
export async function getBusyIntervals(
  shopHandle: string,
  date: string,
): Promise<BusyInterval[]> {
  const supabase = await createClient();

  // Public read on shops.
  const { data: shopData } = await supabase
    .from("shops")
    .select("id")
    .eq("handle", shopHandle)
    .is("archived_at", null)
    .maybeSingle();
  const shop = shopData as { id: string } | null;
  if (!shop) return [];

  const { data, error } = await supabase.rpc("get_busy_intervals", {
    p_shop_id: shop.id,
    p_date: date,
  });
  if (error || !data) return [];

  return (data as { start_minutes: number; end_minutes: number }[]).map((r) => ({
    start: r.start_minutes,
    end: r.end_minutes,
  }));
}
