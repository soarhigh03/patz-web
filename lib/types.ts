// Shared types between web MVP and (future) mobile app.
// Keep these aligned with Supabase schema once Step 4 lands.

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sun

export type ServiceType =
  | "nail_art"
  | "one_color"
  | "pedicure"
  | "hand_foot_care";

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
  services: ServiceType[];
}

export interface Art {
  id: string;
  shopHandle: string;
  service: ServiceType;
  name: string;
  /** KRW. */
  price: number;
  durationMinutes: number;
  imageUrl?: string;
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
