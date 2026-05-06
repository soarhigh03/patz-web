import Image from "next/image";
import { notFound } from "next/navigation";
import { getArt, getShopByHandle } from "@/lib/data";
import { formatDurationKR, formatPriceKRW } from "@/lib/format";
import { StickyCTA } from "@/components/StickyCTA";

interface Params {
  params: Promise<{ handle: string; service: string; artId: string }>;
}

/** Image #4 — art detail view. */
export default async function ArtDetailPage({ params }: Params) {
  const { handle, service, artId } = await params;

  const [shop, art] = await Promise.all([
    getShopByHandle(handle),
    getArt(handle, artId),
  ]);

  if (!shop) notFound();
  if (!shop.serviceCategories.some((c) => c.code === service)) notFound();
  if (!art || art.service !== service) notFound();

  return (
    <main className="min-h-dvh">
      <div className="relative aspect-square w-full bg-neutral-200">
        {art.imageUrl ? (
          <Image
            src={art.imageUrl}
            alt={art.name}
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-cover"
          />
        ) : null}
      </div>

      <section className="px-6 pt-8">
        <h1 className="text-xl font-semibold">{art.name}</h1>

        <dl className="mt-6 space-y-3 text-base">
          <div className="flex items-center justify-between">
            <dt className="text-ink">가격</dt>
            <dd>{formatPriceKRW(art.price)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink">소요시간</dt>
            <dd>{formatDurationKR(art.durationMinutes)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-muted">
          *소요시간은 젤 제거 여부, 연장 여부에 따라 달라질 수 있습니다.
        </p>

        <div className="mt-6 rounded-xl bg-neutral-50 px-5 py-4">
          {art.staffNames && art.staffNames.length > 0 ? (
            <>
              <p className="text-sm font-medium text-ink">지정 쌤</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {art.staffNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-white px-3 py-1 text-sm text-ink shadow-sm ring-1 ring-neutral-200"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink">
              샵 내 모든 쌤에게 받을 수 있어요!
            </p>
          )}
        </div>
      </section>

      <StickyCTA href={`/shops/${handle}/reserve/${service}/${artId}/form`}>
        아트 선택하기
      </StickyCTA>
    </main>
  );
}
