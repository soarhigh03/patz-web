import { notFound } from "next/navigation";
import { getShopByHandle } from "@/lib/data";
import { OptionTile } from "@/components/OptionTile";

interface Params {
  params: Promise<{ handle: string }>;
}

/** Image #2 — option select grid. */
export default async function ReserveOptionPage({ params }: Params) {
  const { handle } = await params;
  const shop = await getShopByHandle(handle);
  if (!shop) notFound();

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-32">
      <h1 className="text-center text-base font-medium">예약 옵션을 선택해주세요.</h1>

      <div className="mt-12 grid grid-cols-2 gap-3">
        {shop.serviceCategories.map((category) => (
          <OptionTile
            key={category.code}
            href={`/shops/${handle}/reserve/${category.code}`}
            label={category.name}
          />
        ))}
      </div>
    </main>
  );
}
