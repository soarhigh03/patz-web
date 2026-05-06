import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { resolveMockAsset } from "./mockAssets";
import {
  getMockShopByHandle,
  listMockShops as listMockShopsFromMock,
  listMockArts,
  getMockArt as getMockArtFromMock,
  getMockStaff,
  getMockAvailableTimes,
} from "./mockData";
import type {
  Art,
  Shop,
  StaffSeed,
  ServiceCategory,
  ShopReservation,
} from "./types";
import type { Database } from "./supabase/types";

/**
 * DB-first reads with mock fallback. Every function here:
 *   1. Asks Supabase for the row(s).
 *   2. If the table is empty (or query errors), falls through to the mock
 *      registry under `public/mockups/<handle>/mockup.ts`.
 *
 * Keeps the site rendering through three states the project will pass through:
 *   - DB unmigrated yet (everything → mock)
 *   - DB migrated, no shops seeded (everything → mock)
 *   - DB seeded (live data)
 *
 * Image columns store a Supabase Storage path. When NULL (e.g., dev seed
 * doesn't upload to Storage yet), we fall back to `resolveMockAsset` which
 * scans `public/mockups/<handle>/...` on disk.
 */

type ShopRow = Database["public"]["Tables"]["shops"]["Row"];
type ArtRow = Database["public"]["Tables"]["arts"]["Row"];
type StaffRow = Database["public"]["Tables"]["staff"]["Row"];
type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];

// Subset shapes for narrowed queries
type ServiceCategoryLite = { id: string; code: string; name: string; sort_order: number };
type ShopIdRow = { id: string; handle: string };
type ArtWithCategory = ArtRow & { service_categories: { code: string } };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function storagePublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

function trimToHHmm(t: string | null): string | undefined {
  if (!t) return undefined;
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function shopImage(
  storagePath: string | null,
  mockBasename: string,
): string | undefined {
  if (storagePath) return storagePublicUrl("shop-assets", storagePath);
  return resolveMockAsset(mockBasename)?.url;
}

function shopImageWithDims(
  storagePath: string | null,
  mockBasename: string,
): { url?: string; width?: number; height?: number } {
  if (storagePath) return { url: storagePublicUrl("shop-assets", storagePath) };
  const mock = resolveMockAsset(mockBasename);
  return mock
    ? { url: mock.url, width: mock.width, height: mock.height }
    : {};
}

function rowToShop(row: ShopRow, categories: ServiceCategory[]): Shop {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    phone: row.phone ?? "",
    address: row.address ?? "",
    hours: {
      // Postgres `time` serializes as "HH:MM:SS"; the BusinessHours contract
      // is "HH:mm" — trim the seconds at the boundary.
      open: trimToHHmm(row.hours_open) ?? "00:00",
      close: trimToHHmm(row.hours_close) ?? "23:59",
      breakStart: trimToHHmm(row.hours_break_start),
      breakEnd: trimToHHmm(row.hours_break_end),
      closedWeekdays: ((row.closed_weekdays ?? []) as number[]).map(
        (n) => n as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      ),
    },
    hoursNote: row.hours_note ?? undefined,
    cautionNote: row.caution_note ?? undefined,
    parkingInfo: row.parking_info ?? undefined,
    profileImageUrl: shopImage(
      row.profile_image_path,
      `mockups/${row.handle}/profile`,
    ),
    backgroundImageUrl: shopImage(
      row.background_image_path,
      `mockups/${row.handle}/background`,
    ),
    location: {
      lat: row.latitude ?? 0,
      lng: row.longitude ?? 0,
    },
    mapBadge: row.map_badge ?? undefined,
    account:
      row.account_bank && row.account_number
        ? { bank: row.account_bank, number: row.account_number }
        : undefined,
    depositAmount: row.deposit_amount ?? undefined,
    serviceCategories: categories,
  };
}

function rowToArt(row: ArtRow, shopHandle: string, serviceCode: string): Art {
  const img = shopImageWithDims(
    row.image_path,
    `mockups/${shopHandle}/arts/${row.code}`,
  );
  return {
    id: row.code, // URL-friendly identifier; FK to row.id when inserting reservations
    shopHandle,
    service: serviceCode,
    name: row.name,
    price: row.price,
    durationMinutes: row.duration_minutes,
    imageUrl: img.url,
    imageWidth: img.width,
    imageHeight: img.height,
  };
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

// Joined select returns shop row + nested categories in one round trip.
// Saves an extra ~50–150ms vs two sequential queries to Supabase.
const SHOP_WITH_CATEGORIES_SELECT = `
  *,
  service_categories(code, name, sort_order, archived_at)
`;

type CategoryJoin = {
  code: string;
  name: string;
  sort_order: number;
  archived_at: string | null;
};

function pickCategories(joined: CategoryJoin[] | null | undefined): ServiceCategory[] {
  return (joined ?? [])
    .filter((c) => c.archived_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ code: c.code, name: c.name }));
}

export async function listShops(): Promise<Shop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select(SHOP_WITH_CATEGORIES_SELECT)
    .is("archived_at", null)
    .order("created_at");

  if (error || !data || data.length === 0) {
    return listMockShopsFromMock();
  }

  const rows = data as (ShopRow & { service_categories: CategoryJoin[] })[];
  return rows.map((row) => rowToShop(row, pickCategories(row.service_categories)));
}

/**
 * `cache()` deduplicates the lookup within a single render — the form page,
 * for example, calls getShopByHandle plus listStaff/listArts that internally
 * resolve shop_id, all sharing this one fetch.
 */
export const getShopByHandle = cache(async (handle: string): Promise<Shop | undefined> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select(SHOP_WITH_CATEGORIES_SELECT)
    .eq("handle", handle)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !data) return getMockShopByHandle(handle);

  const row = data as ShopRow & { service_categories: CategoryJoin[] };
  return rowToShop(row, pickCategories(row.service_categories));
});

export async function listArts(
  handle: string,
  serviceCode?: string,
): Promise<Art[]> {
  const supabase = await createClient();

  // First find the shop by handle (DB) — if absent, fall back to mock.
  const { data: shopData } = await supabase
    .from("shops")
    .select("id, handle")
    .eq("handle", handle)
    .maybeSingle();

  const shopRow = shopData as ShopIdRow | null;
  if (!shopRow) {
    return listMockArts(handle, serviceCode);
  }

  // Look up the matching service_category row (we need both id for the FK
  // filter and code to round-trip into the returned Art).
  let categoryId: string | undefined;
  let resolvedCategoryCode: string | undefined = serviceCode;
  if (serviceCode) {
    const { data: catData } = await supabase
      .from("service_categories")
      .select("id, code")
      .eq("shop_id", shopRow.id)
      .eq("code", serviceCode)
      .maybeSingle();
    const catRow = catData as { id: string; code: string } | null;
    if (!catRow) return [];
    categoryId = catRow.id;
    resolvedCategoryCode = catRow.code;
  }

  let query = supabase
    .from("arts")
    .select("*, service_categories!inner(code), art_staff(staff_id)")
    .eq("shop_id", shopRow.id)
    .is("archived_at", null)
    .order("sort_order");

  if (categoryId) query = query.eq("service_category_id", categoryId);

  const { data, error } = await query;
  if (error || !data) return [];

  type ArtWithStaff = ArtWithCategory & {
    art_staff?: Array<{ staff_id: string }>;
  };
  const artRows = data as ArtWithStaff[];
  return artRows.map((row) => ({
    ...rowToArt(row, handle, resolvedCategoryCode ?? row.service_categories.code),
    staffIds: (row.art_staff ?? []).map((as) => as.staff_id),
  }));
}

export async function getArt(
  handle: string,
  artCode: string,
): Promise<Art | undefined> {
  const supabase = await createClient();

  const { data: shopData } = await supabase
    .from("shops")
    .select("id, handle")
    .eq("handle", handle)
    .maybeSingle();

  const shopRow = shopData as ShopIdRow | null;
  if (!shopRow) return getMockArtFromMock(handle, artCode);

  const { data, error } = await supabase
    .from("arts")
    .select("*, service_categories!inner(code)")
    .eq("shop_id", shopRow.id)
    .eq("code", artCode)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !data) return undefined;

  const row = data as ArtWithCategory;
  return rowToArt(row, handle, row.service_categories.code);
}

export async function listStaff(handle: string): Promise<StaffSeed[]> {
  const supabase = await createClient();

  const { data: shopData } = await supabase
    .from("shops")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();

  const shopRow = shopData as { id: string } | null;
  if (!shopRow) return getMockStaff(handle);

  const { data } = await supabase
    .from("staff")
    .select("id, name, sort_order")
    .eq("shop_id", shopRow.id)
    .eq("active", true)
    .order("sort_order");

  const rows = (data ?? []) as Pick<StaffRow, "id" | "name">[];
  if (rows.length === 0) return getMockStaff(handle);

  return rows.map((r) => ({ id: r.id, name: r.name }));
}

/**
 * Available time slots for a given (shop, date). For now returns the static
 * mock list — Step 6 plugs in real availability computed from shop hours,
 * art duration, staff count, and existing pending/confirmed reservations.
 */
export async function listAvailableTimes(
  handle: string,
  _date?: Date,
): Promise<string[]> {
  return getMockAvailableTimes(handle);
}

/**
 * Reservations for the shop owner's dashboard. Accepts a status filter so
 * the dashboard can split pending requests from the confirmed timetable in
 * a single round-trip if needed.
 *
 * RLS gates this — only rows where `auth.uid()` owns the shop are returned.
 * `fromDate` is a YYYY-MM-DD KST string; defaults to "today" computed in
 * Asia/Seoul so a midnight call from a user in another timezone still hides
 * yesterday's appointments.
 */
export async function listShopReservations(
  shopId: string,
  shopHandle: string,
  options: {
    statuses?: ReadonlyArray<"pending" | "confirmed">;
    fromDate?: string;
  } = {},
): Promise<ShopReservation[]> {
  const supabase = await createClient();

  const today = options.fromDate ?? todayKST();
  const statuses = options.statuses ?? ["confirmed"];

  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      *,
      arts(code, name, image_path),
      service_categories(code, name),
      staff(name)
    `,
    )
    .eq("shop_id", shopId)
    .in("status", [...statuses])
    .gte("reservation_date", today)
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true });

  if (error || !data) return [];

  type Joined = ReservationRow & {
    arts: { code: string; name: string; image_path: string | null } | null;
    service_categories: { code: string; name: string } | null;
    staff: { name: string } | null;
  };
  const rows = data as Joined[];

  return rows.map((r) => {
    const artCode = r.arts?.code ?? "";
    const img = shopImageWithDims(
      r.arts?.image_path ?? null,
      `mockups/${shopHandle}/arts/${artCode}`,
    );
    return {
      id: r.id,
      reservationDate: r.reservation_date,
      reservationTime: r.reservation_time.slice(0, 5), // "HH:mm:ss" → "HH:mm"
      durationMinutes: r.duration_minutes,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      depositorName: r.depositor_name,
      artName: r.art_name,
      artImageUrl: img.url,
      serviceCategoryCode: r.service_categories?.code ?? "",
      serviceCategoryName: r.service_categories?.name ?? "",
      staffName: r.staff?.name ?? null,
      totalPrice: r.total_price,
      depositAmount: r.deposit_amount,
      depositPaidAt: r.deposit_paid_at,
      gelSelfRemoval: r.gel_self_removal,
      gelOtherRemoval: r.gel_other_removal,
      extensionCount: r.extension_count,
      notes: r.notes,
      // The query filters status IN (pending, confirmed); narrow here.
      status: r.status as "pending" | "confirmed",
    };
  });
}

/** Today as YYYY-MM-DD in Asia/Seoul. Reservations are stored as KST dates. */
function todayKST(): string {
  // sv-SE locale yields YYYY-MM-DD with no extra parts
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}
