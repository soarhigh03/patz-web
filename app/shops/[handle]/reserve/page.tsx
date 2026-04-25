import { notFound } from "next/navigation";
import { getMockShopByHandle } from "@/lib/mockData";
import { SERVICE_LABELS, SERVICE_ORDER } from "@/lib/services";
import { OptionTile } from "@/components/OptionTile";

interface Params {
  params: Promise<{ handle: string }>;
}

/** Image #2 — option select grid. */
export default async function ReserveOptionPage({ params }: Params) {
  const { handle } = await params;
  const shop = getMockShopByHandle(handle);
  if (!shop) notFound();

  const enabled = SERVICE_ORDER.filter((s) => shop.services.includes(s));

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-32">
      <h1 className="text-center text-base font-medium">예약 옵션을 선택해주세요.</h1>

      <div className="mt-12 grid grid-cols-2 gap-3">
        {enabled.map((service) => (
          <OptionTile
            key={service}
            href={`/shops/${handle}/reserve/${service}`}
            label={SERVICE_LABELS[service]}
          />
        ))}
      </div>
    </main>
  );
}
