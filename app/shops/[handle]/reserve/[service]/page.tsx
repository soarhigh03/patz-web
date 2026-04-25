import { notFound } from "next/navigation";
import { getMockShopByHandle, listMockArts } from "@/lib/mockData";
import { isServiceType } from "@/lib/services";
import { ArtTile } from "@/components/ArtTile";

interface Params {
  params: Promise<{ handle: string; service: string }>;
}

/** Image #3 — masonry feed of arts for the chosen service. */
export default async function ArtFeedPage({ params }: Params) {
  const { handle, service } = await params;
  if (!isServiceType(service)) notFound();

  const shop = getMockShopByHandle(handle);
  if (!shop || !shop.services.includes(service)) notFound();

  const arts = listMockArts(handle, service);

  return (
    <main className="min-h-dvh px-4 pt-20 pb-10">
      <h1 className="mb-6 text-center text-base font-medium">원하시는 아트를 선택하세요.</h1>

      {arts.length === 0 ? (
        <p className="mt-20 text-center text-sm text-muted">
          아직 등록된 아트가 없어요.
        </p>
      ) : (
        <div className="columns-2 gap-3">
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
