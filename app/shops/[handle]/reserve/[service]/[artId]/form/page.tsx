import { notFound } from "next/navigation";
import {
  getArt,
  getShopByHandle,
  listAvailableTimes,
  listStaff,
} from "@/lib/data";
import { ReservationForm } from "@/components/ReservationForm";

interface Params {
  params: Promise<{ handle: string; service: string; artId: string }>;
}

export default async function ReservationFormPage({ params }: Params) {
  const { handle, service, artId } = await params;

  // All four fetches run in parallel. getShopByHandle is React.cache()-wrapped
  // so the shop_id lookup inside listStaff/getArt deduplicates with this one.
  const [shop, art, staff, availableTimes] = await Promise.all([
    getShopByHandle(handle),
    getArt(handle, artId),
    listStaff(handle),
    listAvailableTimes(handle),
  ]);

  if (!shop) notFound();
  if (!shop.serviceCategories.some((c) => c.code === service)) notFound();
  if (!art || art.service !== service) notFound();

  return (
    <main className="min-h-dvh">
      <ReservationForm
        shop={shop}
        art={art}
        staff={staff}
        availableTimes={availableTimes}
      />
    </main>
  );
}
