import type { Art, Shop } from "./types";

/**
 * Mock data used until Supabase is wired in (Step 4). Shop owners' real images
 * go under `public/mockups/<handle>/...`. Drop a file in there and the public
 * page renders it without any code change.
 */
export const mockShops: Shop[] = [
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
    profileImageUrl: "/mockups/orrnnail/profile.png",
    backgroundImageUrl: "/mockups/orrnnail/background.png",
    location: { lat: 37.5563, lng: 126.9236 },
    mapBadge: "홍대입구역에서 3분 거리에요!",
    account: { bank: "국민은행", number: "000-0000000-00-00000" },
    depositAmount: 20000,
    services: ["nail_art", "one_color", "pedicure", "hand_foot_care"],
  },
];

export const mockArts: Art[] = [
  // Step 2 will populate the feed; placeholders for now so /shops/orrnnail can
  // link forward to a non-empty list during dev.
  { id: "art_1", shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 1", price: 60000, durationMinutes: 60, imageUrl: "/mockups/orrnnail/arts/1.png" },
  { id: "art_2", shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 2", price: 60000, durationMinutes: 60, imageUrl: "/mockups/orrnnail/arts/2.png" },
  { id: "art_3", shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 3", price: 65000, durationMinutes: 60, imageUrl: "/mockups/orrnnail/arts/3.png" },
  { id: "art_4", shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 4", price: 65000, durationMinutes: 60, imageUrl: "/mockups/orrnnail/arts/4.png" },
  { id: "art_5", shopHandle: "orrnnail", service: "nail_art", name: "이달의 아트 5", price: 65000, durationMinutes: 60, imageUrl: "/mockups/orrnnail/arts/5.png" },
];

export function getMockShopByHandle(handle: string): Shop | undefined {
  return mockShops.find((s) => s.handle === handle);
}
