import { notFound } from "next/navigation";
import { getShopByHandle, listArts, listStaff } from "@/lib/data";
import { ArtFeedClient } from "./ArtFeedClient";

interface Params {
  params: Promise<{ handle: string; service: string }>;
}

/** Image #3 — masonry feed of arts for the chosen service. */
export default async function ArtFeedPage({ params }: Params) {
  const { handle, service } = await params;

  const [shop, arts, staff] = await Promise.all([
    getShopByHandle(handle),
    listArts(handle, service),
    listStaff(handle),
  ]);

  if (!shop) notFound();
  if (!shop.serviceCategories.some((c) => c.code === service)) notFound();

  return (
    <ArtFeedClient
      arts={arts}
      staff={staff}
      handle={handle}
      service={service}
    />
  );
}
