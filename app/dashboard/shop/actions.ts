"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SaveShopInput {
  /** URL slug. Must match `^[a-z0-9][a-z0-9-]{1,30}$`. Editable in both
   *  create and edit modes — schema FKs use the row id, not the handle, so
   *  changing it doesn't break internal references. (Sharable URLs do
   *  change.) */
  handle: string;
  name: string;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** "HH:mm" 24h. */
  hoursOpen: string | null;
  hoursClose: string | null;
  hoursBreakStart: string | null;
  hoursBreakEnd: string | null;
  /** 0=Sun … 6=Sat. */
  closedWeekdays: number[];
  hoursNote: string | null;
  cautionNote: string | null;
  parkingInfo: string | null;
  mapBadge: string | null;
  accountBank: string | null;
  accountNumber: string | null;
  depositAmount: number | null;
}

export type SaveShopResult =
  | { ok: true; handle: string; created: boolean }
  | { ok: false; error: string };

/**
 * Create or update the signed-in user's shop. `UNIQUE(owner_id)` on `shops`
 * means the same user can never end up owning two — so this acts as upsert.
 *
 * Handle uniqueness and format are enforced by DB constraints; we duplicate
 * the format check client-side for a friendlier message.
 */
export async function saveShop(
  input: SaveShopInput,
): Promise<SaveShopResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(input.handle)) {
    return {
      ok: false,
      error: "샵 URL은 영문 소문자 / 숫자 / 하이픈으로 2~31자여야 해요.",
    };
  }
  if (!input.name.trim()) {
    return { ok: false, error: "샵 이름을 입력해주세요." };
  }

  const { data: existing } = await supabase
    .from("shops")
    .select("id, handle")
    .eq("owner_id", user.id)
    .maybeSingle();
  const exist = existing as { id: string; handle: string } | null;

  // Field values shared between insert and update.
  const fields = {
    name: input.name.trim(),
    phone: nullable(input.phone),
    address: nullable(input.address),
    latitude: input.latitude,
    longitude: input.longitude,
    hours_open: nullable(input.hoursOpen),
    hours_close: nullable(input.hoursClose),
    hours_break_start: nullable(input.hoursBreakStart),
    hours_break_end: nullable(input.hoursBreakEnd),
    closed_weekdays: input.closedWeekdays,
    hours_note: nullable(input.hoursNote),
    caution_note: nullable(input.cautionNote),
    parking_info: nullable(input.parkingInfo),
    map_badge: nullable(input.mapBadge),
    account_bank: nullable(input.accountBank),
    account_number: nullable(input.accountNumber),
    deposit_amount: input.depositAmount,
  };

  if (exist) {
    const { error } = await supabase
      .from("shops")
      .update({ ...fields, handle: input.handle })
      .eq("id", exist.id);
    if (error) {
      return { ok: false, error: friendlyHandleError(error.message) };
    }
    if (exist.handle !== input.handle) {
      revalidatePath(`/shops/${exist.handle}`);
    }
    revalidatePath(`/shops/${input.handle}`);
    revalidatePath("/dashboard");
    return { ok: true, handle: input.handle, created: false };
  }

  const { error } = await supabase.from("shops").insert({
    ...fields,
    handle: input.handle,
    owner_id: user.id,
  });
  // INSERT into shops is fine to chain with .select() because the SELECT
  // policy is public (`shops_select_public`) — but we don't need the row
  // back, so skip it.
  if (error) {
    return { ok: false, error: friendlyHandleError(error.message) };
  }

  revalidatePath(`/shops/${input.handle}`);
  revalidatePath("/dashboard");
  return { ok: true, handle: input.handle, created: true };
}

/** Empty string → null so we don't write empty-string vs null inconsistencies. */
function nullable(v: string | null): string | null {
  if (v === null) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

/** Surface DB constraint errors as plain Korean. */
function friendlyHandleError(msg: string): string {
  if (msg.includes("shops_handle_key")) {
    return "이미 사용 중인 샵 URL이에요. 다른 값을 입력해주세요.";
  }
  if (msg.includes("handle_format")) {
    return "샵 URL 형식이 올바르지 않아요. 영문 소문자 / 숫자 / 하이픈으로 2~31자.";
  }
  return msg;
}
