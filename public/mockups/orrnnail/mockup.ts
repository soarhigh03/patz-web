import type { ShopMockup } from "@/lib/types";
import { DEFAULT_SERVICE_CATEGORIES } from "@/lib/services";

/**
 * Mockup data for the "orrnnail" shop. Used as a fallback when Supabase
 * has no rows yet (e.g., before 0002_seed_orrnnail.sql is applied).
 *
 * To add a new art: drop the image at `./arts/<id>.{jpeg,jpg,png,webp,gif}`
 * and add a matching entry to the `arts` array below — the resolver picks
 * it up automatically.
 */
const mockup: ShopMockup = {
  shop: {
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
    serviceCategories: DEFAULT_SERVICE_CATEGORIES,
  },
  arts: [
    { id: "1",  service: "nail-art", name: "이달의 아트 1",  price: 60000, durationMinutes: 60 },
    { id: "2",  service: "nail-art", name: "이달의 아트 2",  price: 60000, durationMinutes: 60 },
    { id: "3",  service: "nail-art", name: "이달의 아트 3",  price: 65000, durationMinutes: 60 },
    { id: "4",  service: "nail-art", name: "이달의 아트 4",  price: 65000, durationMinutes: 60 },
    { id: "5",  service: "nail-art", name: "이달의 아트 5",  price: 65000, durationMinutes: 60 },
    { id: "6",  service: "nail-art", name: "이달의 아트 6",  price: 65000, durationMinutes: 60 },
    { id: "7",  service: "nail-art", name: "이달의 아트 7",  price: 70000, durationMinutes: 75 },
    { id: "8",  service: "nail-art", name: "이달의 아트 8",  price: 70000, durationMinutes: 75 },
    { id: "9",  service: "nail-art", name: "이달의 아트 9",  price: 70000, durationMinutes: 75 },
    { id: "10", service: "nail-art", name: "이달의 아트 10", price: 70000, durationMinutes: 75 },
    { id: "11", service: "nail-art", name: "이달의 아트 11", price: 75000, durationMinutes: 90 },

    { id: "oc_1", service: "one-color", name: "원컬러 - 누드",   price: 45000, durationMinutes: 60 },
    { id: "oc_2", service: "one-color", name: "원컬러 - 자주",   price: 45000, durationMinutes: 60 },
    { id: "oc_3", service: "one-color", name: "원컬러 - 화이트", price: 45000, durationMinutes: 60 },

    { id: "pd_1", service: "pedicure", name: "페디큐어 기본",      price: 55000, durationMinutes: 90 },
    { id: "pd_2", service: "pedicure", name: "페디큐어 + 큐티클", price: 65000, durationMinutes: 105 },

    { id: "hc_1", service: "hand-foot-care", name: "손 케어", price: 35000, durationMinutes: 45 },
    { id: "hc_2", service: "hand-foot-care", name: "발 케어", price: 40000, durationMinutes: 60 },
  ],
  staff: [
    { id: "staff_orrn", name: "오른쌤" },
    { id: "staff_yuri", name: "유리쌤" },
  ],
  availableTimes: ["11:00", "12:30", "13:00", "15:00", "16:30", "18:00", "19:30"],
};

export default mockup;
