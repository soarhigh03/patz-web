import "server-only";
import type { Art, Shop, ServiceType } from "./types";
import { resolveMockAsset } from "./mockAssets";

/**
 * Mock data used until Supabase is wired in (Step 4). Image URLs resolve via
 * `resolveMockAsset` so dropping any of {jpeg,jpg,png,webp,gif} into
 * `public/mockups/<handle>/...` Just Works — no code change.
 */

interface ShopSeed extends Omit<Shop, "profileImageUrl" | "backgroundImageUrl"> {}
interface ArtSeed extends Omit<Art, "imageUrl"> {}

const SHOPS: ShopSeed[] = [
  {
    id: "shop_orrnnail",
    handle: "orrnnail",
    name: "오른네일",
    phone: "0507-1330-8551",
    address: "서울 마포구 동교로38길 42-5 3층",
    hoursNote: "*매주 일요일 휴무, 휴게시간 14:00-15:00",
    hours: {
      open: "11:00",
      close: "21:00",
      breakStart: "14:00",
      breakEnd: "15:00",
      closedWeekdays: [0],
    },
    cautionNote:
      "타샵 디자인의 경우 미리 보내주셔야 가능하며, 샵에 있는 재고로 진행되어 완벽히 똑같기는 어렵습니다. 또한, 이달의 아트와 달리 재료 원가가 그대로 책정되어 조금 더 가격이 나갈 수 있습니다.",
    location: { lat: 37.5563, lng: 126.9236 },
    mapBadge: "홍대입구역에서 3분 거리에요!",
    account: { bank: "국민은행", number: "000-0000000-00-00000" },
    depositAmount: 20000,
    services: ["nail_art", "one_color", "pedicure", "hand_foot_care"],
  },
];

// Aspect ratios produce a varied masonry feed even with placeholder gray boxes.
// Once real images arrive, we'll switch to natural dimensions.
const ARTS: ArtSeed[] = [
  { id: "1",  shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 1",  price: 60000, durationMinutes: 60, aspectRatio: 3 / 4 },
  { id: "2",  shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 2",  price: 60000, durationMinutes: 60, aspectRatio: 1 },
  { id: "3",  shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 3",  price: 65000, durationMinutes: 60, aspectRatio: 1 },
  { id: "4",  shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 4",  price: 65000, durationMinutes: 60, aspectRatio: 3 / 4 },
  { id: "5",  shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 5",  price: 65000, durationMinutes: 60, aspectRatio: 3 / 4 },
  { id: "6",  shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 6",  price: 65000, durationMinutes: 60, aspectRatio: 1 },
  { id: "7",  shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 7",  price: 70000, durationMinutes: 75, aspectRatio: 3 / 4 },
  { id: "8",  shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 8",  price: 70000, durationMinutes: 75, aspectRatio: 1 },
  { id: "9",  shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 9",  price: 70000, durationMinutes: 75, aspectRatio: 3 / 4 },
  { id: "10", shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 10", price: 70000, durationMinutes: 75, aspectRatio: 1 },
  { id: "11", shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 11", price: 75000, durationMinutes: 90, aspectRatio: 3 / 4 },

  { id: "oc_1", shopHandle: "orrnnail", service: "one_color", name: "원컬러 - 누드", price: 45000, durationMinutes: 60, aspectRatio: 1 },
  { id: "oc_2", shopHandle: "orrnnail", service: "one_color", name: "원컬러 - 자주", price: 45000, durationMinutes: 60, aspectRatio: 3 / 4 },
  { id: "oc_3", shopHandle: "orrnnail", service: "one_color", name: "원컬러 - 화이트", price: 45000, durationMinutes: 60, aspectRatio: 1 },

  { id: "pd_1", shopHandle: "orrnnail", service: "pedicure", name: "페디큐어 기본", price: 55000, durationMinutes: 90, aspectRatio: 1 },
  { id: "pd_2", shopHandle: "orrnnail", service: "pedicure", name: "페디큐어 + 큐티클", price: 65000, durationMinutes: 105, aspectRatio: 3 / 4 },

  { id: "hc_1", shopHandle: "orrnnail", service: "hand_foot_care", name: "손 케어", price: 35000, durationMinutes: 45, aspectRatio: 1 },
  { id: "hc_2", shopHandle: "orrnnail", service: "hand_foot_care", name: "발 케어", price: 40000, durationMinutes: 60, aspectRatio: 1 },
];

function hydrateShop(seed: ShopSeed): Shop {
  return {
    ...seed,
    profileImageUrl: resolveMockAsset(`mockups/${seed.handle}/profile`),
    backgroundImageUrl: resolveMockAsset(`mockups/${seed.handle}/background`),
  };
}

function hydrateArt(seed: ArtSeed): Art {
  return {
    ...seed,
    imageUrl: resolveMockAsset(`mockups/${seed.shopHandle}/arts/${seed.id}`),
  };
}

export function listMockShops(): Shop[] {
  return SHOPS.map(hydrateShop);
}

export function getMockShopByHandle(handle: string): Shop | undefined {
  const seed = SHOPS.find((s) => s.handle === handle);
  return seed ? hydrateShop(seed) : undefined;
}

export function listMockArts(handle: string, service?: ServiceType): Art[] {
  return ARTS.filter(
    (a) => a.shopHandle === handle && (service ? a.service === service : true),
  ).map(hydrateArt);
}

export function getMockArt(handle: string, artId: string): Art | undefined {
  const seed = ARTS.find((a) => a.shopHandle === handle && a.id === artId);
  return seed ? hydrateArt(seed) : undefined;
}
