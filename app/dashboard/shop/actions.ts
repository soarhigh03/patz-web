"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";

export type ShopType = "solo" | "multi";
export type HoursMode = "fixed" | "per_weekday" | "by_reservation";

/** Per-weekday open/close. Keys: "0" (Sun) .. "6" (Sat). Both fields optional. */
export type HoursPerWeekday = Record<
  string,
  { open: string | null; close: string | null }
>;

export interface SaveShopInput {
  /** URL slug. Must match `^[a-z0-9][a-z0-9-]{1,30}$`. */
  handle: string;
  name: string;
  shopType: ShopType;
  /** Names of additional staff (used only when shopType === 'multi'). */
  staffNames: string[];
  phone: string | null;
  address: string | null;
  hoursMode: HoursMode;
  /** "HH:mm". Used only when hoursMode === 'fixed'. */
  hoursOpen: string | null;
  hoursClose: string | null;
  /** "HH:mm". null when 휴게 toggle is off. Used only when hoursMode === 'fixed'. */
  hoursBreakStart: string | null;
  hoursBreakEnd: string | null;
  /** Used only when hoursMode === 'per_weekday'. */
  hoursPerWeekday: HoursPerWeekday;
  /** 0=Sun … 6=Sat. Used only when hoursMode === 'fixed'. */
  closedWeekdays: number[];
  hoursNote: string | null;
  cautionNote: string | null;
  parkingInfo: string | null;
  mapBadge: string | null;
  accountBank: string | null;
  accountNumber: string | null;
  /** null when 예약금 toggle is off. */
  depositAmount: number | null;
}

export type SaveShopResult =
  | { ok: true; handle: string; created: boolean }
  | { ok: false; error: string };

/**
 * Create or update the signed-in user's shop. `UNIQUE(owner_id)` on `shops`
 * means the same user can never end up owning two — so this acts as upsert.
 *
 * Coordinates are derived from `address` via Kakao Local; if the lookup fails
 * we save lat/lng as null (the public page just hides the map pin).
 */
export async function saveShop(
  input: SaveShopInput,
): Promise<SaveShopResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  if (!/^[a-z0-9][a-z0-9-]{3,30}$/.test(input.handle)) {
    return {
      ok: false,
      error: "샵 URL은 영문 소문자 / 숫자 / 하이픈으로 4~31자여야 해요.",
    };
  }
  if (!input.name.trim()) {
    return { ok: false, error: "샵 이름을 입력해주세요." };
  }

  const coords = input.address
    ? await geocodeAddress(input.address)
    : null;

  const { data: existing } = await supabase
    .from("shops")
    .select("id, handle")
    .eq("owner_id", user.id)
    .maybeSingle();
  const exist = existing as { id: string; handle: string } | null;

  // Mode-aware nulling: only persist fields relevant to the chosen hoursMode.
  const fixedHours = input.hoursMode === "fixed";
  const perWeekday = input.hoursMode === "per_weekday";

  const fields = {
    name: input.name.trim(),
    shop_type: input.shopType,
    phone: nullable(input.phone),
    address: nullable(input.address),
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    hours_mode: input.hoursMode,
    hours_open: fixedHours ? nullable(input.hoursOpen) : null,
    hours_close: fixedHours ? nullable(input.hoursClose) : null,
    hours_break_start: fixedHours ? nullable(input.hoursBreakStart) : null,
    hours_break_end: fixedHours ? nullable(input.hoursBreakEnd) : null,
    hours_per_weekday: perWeekday ? input.hoursPerWeekday : null,
    closed_weekdays: fixedHours ? input.closedWeekdays : [],
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

    // Sync staff table for multi-staff shops
    if (input.shopType === "multi") {
      const cleanedStaff = input.staffNames
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Load existing active staff
      const { data: existingStaff } = await supabase
        .from("staff")
        .select("id, name, sort_order")
        .eq("shop_id", exist.id)
        .eq("active", true)
        .order("sort_order");
      const current = (existingStaff ?? []) as Array<{
        id: string;
        name: string;
        sort_order: number;
      }>;

      const currentNames = current.map((s) => s.name);

      // Deactivate staff no longer in the list
      const toDeactivate = current.filter(
        (s) => !cleanedStaff.includes(s.name),
      );
      for (const s of toDeactivate) {
        await supabase
          .from("staff")
          .update({ active: false })
          .eq("id", s.id);
      }

      // Insert new staff not already present
      const toInsert = cleanedStaff.filter((n) => !currentNames.includes(n));
      if (toInsert.length > 0) {
        const rows = toInsert.map((name, i) => ({
          shop_id: exist.id,
          name,
          sort_order: current.length + i,
        }));
        await supabase.from("staff").insert(rows);
      }

      // Update sort_order for existing staff that remain
      for (let i = 0; i < cleanedStaff.length; i++) {
        const match = current.find((s) => s.name === cleanedStaff[i]);
        if (match && match.sort_order !== i) {
          await supabase
            .from("staff")
            .update({ sort_order: i })
            .eq("id", match.id);
        }
      }
    }

    if (exist.handle !== input.handle) {
      revalidatePath(`/shops/${exist.handle}`);
    }
    revalidatePath(`/shops/${input.handle}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/shop");
    return { ok: true, handle: input.handle, created: false };
  }

  const { data: inserted, error } = await supabase
    .from("shops")
    .insert({
      ...fields,
      handle: input.handle,
      owner_id: user.id,
    })
    .select("id")
    .single();
  if (error) {
    return { ok: false, error: friendlyHandleError(error.message) };
  }
  const newShopId = (inserted as { id: string } | null)?.id;

  // 여러 명 운영 → 입력한 쌤 이름들을 staff 테이블에 적재.
  if (input.shopType === "multi" && newShopId) {
    const cleanedStaff = input.staffNames
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (cleanedStaff.length > 0) {
      const rows = cleanedStaff.map((name, i) => ({
        shop_id: newShopId,
        name,
        sort_order: i,
      }));
      await supabase.from("staff").insert(rows);
      // 실패해도 샵 자체는 만들어진 상태이므로 막지는 않는다 — 사용자는 추후
      // 아트/쌤 관리에서 직접 수정할 수 있다.
    }
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

/**
 * Persist the path of an uploaded shop profile / background image to the
 * `shops` row. The image itself is uploaded client-side directly to
 * Storage; this action only records where it landed.
 */
export async function updateShopImage(
  field: "profile" | "background",
  path: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const column =
    field === "profile" ? "profile_image_path" : "background_image_path";

  const { data: shopRow } = await supabase
    .from("shops")
    .select("id, handle")
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as { id: string; handle: string } | null;
  if (!shop) return { ok: false, error: "샵을 찾을 수 없어요." };

  const { error } = await supabase
    .from("shops")
    .update({ [column]: path })
    .eq("id", shop.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/shop");
  revalidatePath("/dashboard");
  revalidatePath(`/shops/${shop.handle}`);
  return { ok: true };
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
