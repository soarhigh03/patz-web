"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReservationStatus } from "@/lib/supabase/types";

export type ReservationActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Shop owner accept/reject for a `pending` reservation.
 *
 * RLS gates the UPDATE: only `auth.uid() == shops.owner_id` can run it (per
 * `reservations_update_owner` policy in 0001_init.sql). We pre-flight by
 * loading the row with the user's session — if the user can't see it, they
 * can't change it either, so we return a clean "찾을 수 없어요" message
 * instead of leaking the underlying RLS error.
 */
async function setReservationStatus(
  reservationId: string,
  next: Extract<ReservationStatus, "confirmed" | "rejected">,
): Promise<ReservationActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const { data: existing } = await supabase
    .from("reservations")
    .select("id, status")
    .eq("id", reservationId)
    .maybeSingle();
  const row = existing as { id: string; status: ReservationStatus } | null;
  if (!row) return { ok: false, error: "예약을 찾을 수 없어요." };
  if (row.status !== "pending") {
    return { ok: false, error: "이미 처리된 예약이에요." };
  }

  const { error } = await supabase
    .from("reservations")
    .update({ status: next })
    .eq("id", reservationId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/reservations");
  return { ok: true };
}

export async function acceptReservation(
  reservationId: string,
): Promise<ReservationActionResult> {
  return setReservationStatus(reservationId, "confirmed");
}

export async function rejectReservation(
  reservationId: string,
): Promise<ReservationActionResult> {
  return setReservationStatus(reservationId, "rejected");
}

export interface CreateManualReservationInput {
  /** YYYY-MM-DD (KST). */
  reservationDate: string;
  /** "HH:mm". */
  reservationTime: string;
  /** Minutes — picked from the end-time pill grid (end - start). */
  durationMinutes: number;
  /** Optional free-form note the owner can use to remember who/what. */
  notes?: string | null;
}

/**
 * Quick-add reservation for shop owners migrating in pre-existing bookings.
 * Inserts directly as `confirmed` (the appointment already exists IRL — there
 * is nothing to "수락"), with `is_manual = true` so the timetable can render
 * a stripped-down card and skip the accept/reject controls.
 *
 * Schema-side (migration 0009): the customer/art/price snapshot columns are
 * nullable when is_manual, gated by the `manual_or_full` CHECK so the
 * customer flow's invariants stay strict.
 */
export async function createManualReservation(
  input: CreateManualReservationInput,
): Promise<ReservationActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  // Resolve the owner's shop. The dashboard already enforces 1 shop per owner
  // (the page-level query uses .maybeSingle on owner_id), so this lookup is
  // the same shape — no shop selector needed.
  const { data: shopData } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .is("archived_at", null)
    .maybeSingle();
  const shop = shopData as { id: string } | null;
  if (!shop) return { ok: false, error: "샵을 찾을 수 없어요." };

  if (input.durationMinutes <= 0 || input.durationMinutes % 30 !== 0) {
    return { ok: false, error: "시술 시간이 올바르지 않아요." };
  }

  const { error } = await supabase.from("reservations").insert({
    shop_id: shop.id,
    reservation_date: input.reservationDate,
    reservation_time: input.reservationTime,
    duration_minutes: input.durationMinutes,
    notes: input.notes?.trim() || null,
    is_manual: true,
    // Pre-existing offline bookings are already confirmed in real life — skip
    // the "요청 → 수락" loop that the customer flow needs.
    status: "confirmed",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/reservations");
  return { ok: true };
}
