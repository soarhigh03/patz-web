import { notFound } from "next/navigation";
import { getShopByHandle, listArts } from "@/lib/data";
import { ArtTile } from "@/components/ArtTile";

interface Params {
  params: Promise<{ handle: string; service: string }>;
}

/** Image #3 — masonry feed of arts for the chosen service. */
export default async function ArtFeedPage({ params }: Params) {
  const { handle, service } = await params;

  const shop = await getShopByHandle(handle);
  if (!shop) notFound();

  // Service code must be one of the shop's enabled categories
  if (!shop.serviceCategories.some((c) => c.code === service)) notFound();

  const arts = await listArts(handle, service);

  return (
    <main className="min-h-dvh px-4 pt-20 pb-10">
      <h1 className="mb-6 text-center text-base font-medium">원하시는 아트를 선택하세요.</h1>

      {arts.length === 0 ? (
        <p className="mt-20 text-center text-sm text-muted">
          아직 등록된 아트가 없어요.
        </p>
      ) : (
        <div className="grid grid-cols-2 items-start gap-3">
          {arts.map((art) => (
            <ArtTile
              key={art.id}
              art={art}
              href={`/shops/${handle}/reserve/${service}/${art.id}`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
