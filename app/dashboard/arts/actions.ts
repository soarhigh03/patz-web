"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeReservationDuration } from "@/lib/duration";

export interface SaveArtInput {
  /** Either an existing art's UUID (edit) or a client-generated one (create). */
  id: string;
  /** URL slug, unique within shop. */
  code: string;
  /** Service category code (e.g. "nail-art"). Resolved to id server-side. */
  serviceCategoryCode: string;
  name: string;
  price: number;
  /** Storage path in shop-assets. Optional — arts can ship without an image. */
  imagePath: string | null;
  isThisMonth: boolean;
}

export type SaveArtResult =
  | { ok: true; created: boolean; code: string }
  | { ok: false; error: string };

const RESERVED_CODES = new Set(["new"]);

/**
 * Insert or update an art row. New rows expect the client to pass a
 * pre-generated UUID so an already-uploaded image (whose path embeds
 * that UUID) lands on the right row at first INSERT.
 *
 * `arts.duration_minutes` is no longer the booking-time source of truth —
 * the form computes the *base* duration per category (per the project
 * rule: 손/발 케어 30, 그 외 60) so the column stays NOT-NULL-valid. The
 * customer's actual appointment length is recomputed at booking time
 * from category + 제거 + 연장.
 */
export async function saveArt(input: SaveArtInput): Promise<SaveArtResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  if (!/^[a-zA-Z0-9_-]+$/.test(input.code)) {
    return {
      ok: false,
      error: "아트 코드는 영문 / 숫자 / 하이픈 / 언더스코어만 사용할 수 있어요.",
    };
  }
  if (RESERVED_CODES.has(input.code)) {
    return { ok: false, error: `'${input.code}'는 예약된 단어라 사용할 수 없어요.` };
  }
  if (!input.name.trim()) {
    return { ok: false, error: "아트 이름을 입력해주세요." };
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    return { ok: false, error: "가격은 0원 이상이어야 해요." };
  }

  const { data: shopRow } = await supabase
    .from("shops")
    .select("id, handle")
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as { id: string; handle: string } | null;
  if (!shop) return { ok: false, error: "샵을 먼저 만들어주세요." };

  const { data: catRow } = await supabase
    .from("service_categories")
    .select("id")
    .eq("shop_id", shop.id)
    .eq("code", input.serviceCategoryCode)
    .is("archived_at", null)
    .maybeSingle();
  const cat = catRow as { id: string } | null;
  if (!cat) return { ok: false, error: "서비스 카테고리를 찾을 수 없어요." };

  // Base duration mirrors lib/duration.ts so reservations stay consistent.
  const durationMinutes = computeReservationDuration({
    serviceCode: input.serviceCategoryCode,
    hasRemoval: false,
    hasExtension: false,
  });

  const fields = {
    code: input.code.trim(),
    service_category_id: cat.id,
    name: input.name.trim(),
    price: Math.floor(input.price),
    duration_minutes: durationMinutes,
    image_path: input.imagePath,
    is_this_month: input.isThisMonth,
  };

  const { data: existing } = await supabase
    .from("arts")
    .select("id")
    .eq("id", input.id)
    .eq("shop_id", shop.id)
    .maybeSingle();
  const isUpdate = existing !== null;

  if (isUpdate) {
    const { error } = await supabase
      .from("arts")
      .update(fields)
      .eq("id", input.id)
      .eq("shop_id", shop.id);
    if (error) return { ok: false, error: friendlyArtError(error.message) };
  } else {
    const { error } = await supabase.from("arts").insert({
      ...fields,
      id: input.id,
      shop_id: shop.id,
    });
    if (error) return { ok: false, error: friendlyArtError(error.message) };
  }

  revalidatePath("/dashboard/arts");
  revalidatePath(`/shops/${shop.handle}`);
  revalidatePath(`/shops/${shop.handle}/reserve/${input.serviceCategoryCode}`);
  revalidatePath(
    `/shops/${shop.handle}/reserve/${input.serviceCategoryCode}/${input.code}`,
  );

  return { ok: true, created: !isUpdate, code: fields.code };
}

/** Soft delete — keeps historical reservations resolvable to this art. */
export async function archiveArt(
  artId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const { data: shopRow } = await supabase
    .from("shops")
    .select("id, handle")
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as { id: string; handle: string } | null;
  if (!shop) return { ok: false, error: "샵을 먼저 만들어주세요." };

  const { error } = await supabase
    .from("arts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", artId)
    .eq("shop_id", shop.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/arts");
  revalidatePath(`/shops/${shop.handle}`);
  return { ok: true };
}

function friendlyArtError(msg: string): string {
  if (msg.includes("arts_shop_id_code_key")) {
    return "이미 사용 중인 아트 코드예요. 다른 값을 입력해주세요.";
  }
  return msg;
}
