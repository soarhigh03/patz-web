import { notFound } from "next/navigation";
import { getShopByHandle, listArts, listStaff } from "@/lib/data";
import { AllArtsFeed } from "./AllArtsFeed";

interface Params {
  params: Promise<{ handle: string }>;
}

export default async function ReservePage({ params }: Params) {
  const { handle } = await params;

  const [shop, arts, staff] = await Promise.all([
    getShopByHandle(handle),
    listArts(handle), // all arts, no service filter
    listStaff(handle),
  ]);

  if (!shop) notFound();

  return (
    <AllArtsFeed
      arts={arts}
      categories={shop.serviceCategories}
      staff={staff}
      handle={handle}
    />
  );
}
