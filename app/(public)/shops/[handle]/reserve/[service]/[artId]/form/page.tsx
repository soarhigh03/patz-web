import { notFound } from "next/navigation";
import { getArt, getShopByHandle, listStaff } from "@/lib/data";
import { ReservationForm } from "@/components/ReservationForm";
import { BackButton } from "@/components/BackButton";

interface Params {
  params: Promise<{ handle: string; service: string; artId: string }>;
}

export default async function ReservationFormPage({ params }: Params) {
  const { handle, service, artId } = await params;

  // getShopByHandle is React.cache()-wrapped so the shop_id lookup inside
  // listStaff/getArt deduplicates with this one. Time slots are computed
  // on the client from shop hours + live busy intervals (per date).
  const [shop, art, staff] = await Promise.all([
    getShopByHandle(handle),
    getArt(handle, artId),
    listStaff(handle),
  ]);

  if (!shop) notFound();
  if (!shop.serviceCategories.some((c) => c.code === service)) notFound();
  if (!art || art.service !== service) notFound();

  return (
    <main className="min-h-dvh">
      <BackButton />
      <ReservationForm shop={shop} art={art} staff={staff} />
    </main>
  );
}
