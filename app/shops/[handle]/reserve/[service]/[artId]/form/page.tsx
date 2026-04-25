import { notFound } from "next/navigation";
import {
  getMockArt,
  getMockAvailableTimes,
  getMockShopByHandle,
  getMockStaff,
} from "@/lib/mockData";
import { isServiceType } from "@/lib/services";
import { ReservationForm } from "@/components/ReservationForm";

interface Params {
  params: Promise<{ handle: string; service: string; artId: string }>;
}

export default async function ReservationFormPage({ params }: Params) {
  const { handle, service, artId } = await params;
  if (!isServiceType(service)) notFound();

  const shop = getMockShopByHandle(handle);
  const art = getMockArt(handle, artId);
  if (!shop || !art || art.service !== service) notFound();

  return (
    <main className="min-h-dvh">
      <ReservationForm
        shop={shop}
        art={art}
        staff={getMockStaff(handle)}
        availableTimes={getMockAvailableTimes(handle)}
      />
    </main>
  );
}
