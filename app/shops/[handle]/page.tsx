import { notFound } from "next/navigation";
import { Clock, Phone, MapPin, Megaphone } from "lucide-react";
import { getMockShopByHandle } from "@/lib/mockData";
import { ShopHeader } from "@/components/ShopHeader";
import { OpenBadge } from "@/components/OpenBadge";
import { CopyButton } from "@/components/CopyButton";
import { KakaoMap } from "@/components/KakaoMap";
import { StickyCTA } from "@/components/StickyCTA";

interface Params {
  params: Promise<{ handle: string }>;
}

export default async function ShopPage({ params }: Params) {
  const { handle } = await params;
  const shop = getMockShopByHandle(handle);
  if (!shop) notFound();

  return (
    <main className="pb-2">
      <ShopHeader shop={shop} />

      <section className="mt-6 space-y-5 px-6">
        <Row icon={<Clock size={18} />}>
          <div className="flex w-full items-start justify-between gap-3">
            <div>
              <p className="text-base">
                {shop.hours.open} - {shop.hours.close}
              </p>
              {shop.hoursNote && (
                <p className="mt-0.5 text-xs text-muted">{shop.hoursNote}</p>
              )}
            </div>
            <OpenBadge hours={shop.hours} className="shrink-0" />
          </div>
        </Row>

        <Row icon={<Phone size={18} />}>
          <div className="flex w-full items-center justify-between">
            <span className="text-base">{shop.phone}</span>
            <CopyButton value={shop.phone} label="전화번호" />
          </div>
        </Row>

        <Row icon={<MapPin size={18} />}>
          <div className="flex w-full items-center justify-between">
            <span className="text-base">{shop.address}</span>
            <CopyButton value={shop.address} label="주소" />
          </div>
        </Row>

        <KakaoMap
          lat={shop.location.lat}
          lng={shop.location.lng}
          shopName={shop.name}
          badge={shop.mapBadge}
        />

        {shop.cautionNote && (
          <div className="flex gap-3 pt-1 text-xs leading-relaxed text-neutral-700">
            <Megaphone size={16} className="mt-0.5 shrink-0 text-muted" />
            <p>{shop.cautionNote}</p>
          </div>
        )}
      </section>

      <StickyCTA href={`/shops/${shop.handle}/reserve`}>
        PATZ 를 통해 예약하기
      </StickyCTA>
    </main>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <div className="flex w-full">{children}</div>
    </div>
  );
}
