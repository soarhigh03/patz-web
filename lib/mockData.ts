import "server-only";
import type { Art, Shop, ServiceType, ShopMockup, StaffSeed } from "./types";
import { resolveMockAsset } from "./mockAssets";

import orrnnail from "@/public/mockups/orrnnail/mockup";

/* -------------------------------------------------------------------------- */
/*  Registry                                                                  */
/* -------------------------------------------------------------------------- */
/* To add a new shop:
 *   1. mkdir public/mockups/<handle>/
 *   2. drop in profile.{ext}, background.{ext}, arts/<id>.{ext}
 *   3. create public/mockups/<handle>/mockup.ts (copy from orrnnail's)
 *   4. import + push the module here
 */
const MOCKUPS: ShopMockup[] = [orrnnail];

/* -------------------------------------------------------------------------- */
/*  Hydration                                                                 */
/* -------------------------------------------------------------------------- */

interface HydratedShop {
  shop: Shop;
  arts: Art[];
  staff: StaffSeed[];
  availableTimes: string[];
}

function hydrate(mockup: ShopMockup): HydratedShop {
  const handle = mockup.shop.handle;

  const profile = resolveMockAsset(`mockups/${handle}/profile`);
  const background = resolveMockAsset(`mockups/${handle}/background`);

  const shop: Shop = {
    ...mockup.shop,
    profileImageUrl: profile?.url,
    backgroundImageUrl: background?.url,
  };

  const arts: Art[] = mockup.arts.map((seed) => {
    const asset = resolveMockAsset(`mockups/${handle}/arts/${seed.id}`);
    return {
      ...seed,
      shopHandle: handle,
      imageUrl: asset?.url,
      imageWidth: asset?.width,
      imageHeight: asset?.height,
    };
  });

  return { shop, arts, staff: mockup.staff, availableTimes: mockup.availableTimes };
}

const HYDRATED: HydratedShop[] = MOCKUPS.map(hydrate);

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function listMockShops(): Shop[] {
  return HYDRATED.map((h) => h.shop);
}

export function getMockShopByHandle(handle: string): Shop | undefined {
  return HYDRATED.find((h) => h.shop.handle === handle)?.shop;
}

export function listMockArts(handle: string, service?: ServiceType): Art[] {
  const all = HYDRATED.find((h) => h.shop.handle === handle)?.arts ?? [];
  return service ? all.filter((a) => a.service === service) : all;
}

export function getMockArt(handle: string, artId: string): Art | undefined {
  return HYDRATED.find((h) => h.shop.handle === handle)?.arts.find(
    (a) => a.id === artId,
  );
}

export function getMockStaff(handle: string): StaffSeed[] {
  return HYDRATED.find((h) => h.shop.handle === handle)?.staff ?? [];
}

export function getMockAvailableTimes(handle: string): string[] {
  return HYDRATED.find((h) => h.shop.handle === handle)?.availableTimes ?? [];
}
