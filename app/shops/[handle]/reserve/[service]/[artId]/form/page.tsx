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

  const shop = await getShopByHandle(handle);
  if (!shop) notFound();
  if (!shop.serviceCategories.some((c) => c.code === service)) notFound();

  const art = await getArt(handle, artId);
  if (!art || art.service !== service) notFound();

  const [staff, availableTimes] = await Promise.all([
    listStaff(handle),
    listAvailableTimes(handle),
  ]);

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
