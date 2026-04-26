// Shared types between web MVP and (future) mobile app.
// Keep these aligned with Supabase schema once Step 4 lands.

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sun

/**
 * Service category code (URL slug). The four built-in defaults are seeded on
 * shop creation; shops can add custom codes (왁싱, 아이래시, ...). Stored as
 * `string` rather than a closed union so custom shop categories type-check.
 */
export type ServiceCode = string;

/** A shop's service category (seeded default OR shop-defined custom). */
export interface ServiceCategory {
  code: ServiceCode;        // URL slug, e.g. "nail-art"
  name: string;             // display name, e.g. "네일아트 (손)"
}

export interface BusinessHours {
  /** "HH:mm" 24h, Asia/Seoul-local. */
  open: string;
  close: string;
  /** Optional break window — shop shows as 영업 종료 during this range. */
  breakStart?: string;
  breakEnd?: string;
  /** Weekdays the shop is fully closed (휴무). */
  closedWeekdays: Weekday[];
}

export interface Shop {
  id: string;
  handle: string;
  name: string;
  phone: string;
  address: string;
  /** Korean human note shown under hours, e.g. "*매주 일요일 휴무, 휴게시간 14:00-15:00". */
  hoursNote?: string;
  hours: BusinessHours;
  parkingInfo?: string;
  notes?: string;
  /** Free-form 안내 shown above the CTA. */
  cautionNote?: string;
  profileImageUrl?: string;
  backgroundImageUrl?: string;
  location: { lat: number; lng: number };
  /** Optional one-liner shown over the map, e.g. "홍대입구역에서 3분 거리에요!". */
  mapBadge?: string;
  account?: { bank: string; number: string };
  depositAmount?: number;
  /** Service categories enabled for this shop (default 4 + any custom). */
  serviceCategories: ServiceCategory[];
}

export interface Art {
  id: string;
  shopHandle: string;
  service: ServiceCode;
  name: string;
  /** KRW. */
  price: number;
  durationMinutes: number;
  imageUrl?: string;
  /** Natural pixel dimensions of imageUrl, when available. Used to size the
   * feed/detail images at their true aspect ratio without CLS. */
  imageWidth?: number;
  imageHeight?: number;
}

export interface Staff {
  id: string;
  shopHandle: string;
  name: string;
  /** Weekdays this 쌤 is available. */
  availableWeekdays: Weekday[];
  availableStart: string;
  availableEnd: string;
}

/* -------------------------------------------------------------------------- */
/*  Per-shop mockup.ts seed types                                             */
/* -------------------------------------------------------------------------- */

/** Seed data shape for a shop's `public/mockups/<handle>/mockup.ts` file.
 *  Image URLs are not part of the seed — they're resolved from the filesystem
 *  by `lib/mockAssets.ts` based on the shop handle. */
export type ShopSeed = Omit<Shop, "profileImageUrl" | "backgroundImageUrl">;

/** Seed entry for a single art in `arts: ArtSeed[]`. `shopHandle` and image
 *  fields are filled in by the registry — keep these files focused on the
 *  shop-specific copy/pricing/duration. */
export type ArtSeed = Omit<
  Art,
  "shopHandle" | "imageUrl" | "imageWidth" | "imageHeight"
>;

/** Seed entry for a single 쌤 (staff). Schedule fields can be added later;
 *  for the form picker we only need id + display name. */
export interface StaffSeed {
  id: string;
  name: string;
}

/* -------------------------------------------------------------------------- */
/*  Shop dashboard                                                            */
/* -------------------------------------------------------------------------- */

/** Flattened shape used by the shop owner's reservation timetable. Joins the
 *  raw reservation row with the related art / service category / staff so the
 *  client component can render rows + the detail modal without extra fetches. */
export interface ShopReservation {
  id: string;
  /** YYYY-MM-DD (Asia/Seoul). */
  reservationDate: string;
  /** HH:mm. */
  reservationTime: string;
  durationMinutes: number;

  customerName: string;
  /** 010xxxxxxxx — formatter belongs to the renderer. */
  customerPhone: string;
  depositorName: string | null;

  artName: string;
  artImageUrl?: string;
  serviceCategoryCode: string;
  serviceCategoryName: string;
  /** null = "상관없음" at booking time, OR specific staff was archived. */
  staffName: string | null;

  totalPrice: number;
  depositAmount: number;
  depositPaidAt: string | null;

  gelSelfRemoval: boolean;
  gelOtherRemoval: boolean;
  extensionCount: number;
  notes: string | null;

  /** "pending" or "confirmed" — only these two reach the dashboard view. */
  status: "pending" | "confirmed";
}

/** What each `public/mockups/<handle>/mockup.ts` must export. */
export interface ShopMockup {
  shop: ShopSeed;
  arts: ArtSeed[];
  staff: StaffSeed[];
  /** Mock available time slots shown in the reservation form. Step 4/6 will
   *  replace with real per-date availability computed from shop hours, art
   *  duration, and existing bookings. */
  availableTimes: string[];
}
