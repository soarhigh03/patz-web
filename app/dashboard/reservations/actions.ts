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
