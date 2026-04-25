"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface KakaoMapProps {
  lat: number;
  lng: number;
  shopName: string;
  badge?: string;
}

/**
 * Renders a Kakao Map centered on the shop. When NEXT_PUBLIC_KAKAO_MAP_KEY is
 * not configured (or the SDK fails to load), falls back to a styled placeholder
 * so the page still renders during early development.
 */
export function KakaoMap({ lat, lng, shopName, badge }: KakaoMapProps) {
  const mapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const w = window as unknown as { kakao?: KakaoNamespace };
    const kakao = w.kakao;
    if (!kakao?.maps) {
      setFailed(true);
      return;
    }
    kakao.maps.load(() => {
      if (!ref.current) return;
      const center = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(ref.current, { center, level: 4 });
      new kakao.maps.Marker({ map, position: center, title: shopName });
    });
  }, [ready, lat, lng, shopName]);

  if (!mapKey) return <MapFallback badge={badge} reason="missing-key" />;

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-line bg-neutral-100">
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${mapKey}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div ref={ref} className="absolute inset-0" />
      {failed && <MapFallback badge={badge} reason="load-error" />}
      {badge && !failed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-ink/85 px-3 py-1.5 text-xs text-white">
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

function MapFallback({ badge, reason }: { badge?: string; reason: "missing-key" | "load-error" }) {
  return (
    <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-neutral-100 text-muted">
      <div className="flex flex-col items-center gap-2 text-xs">
        <MapPin size={20} />
        <span>
          {reason === "missing-key"
            ? "Kakao Map 키 미설정 (NEXT_PUBLIC_KAKAO_MAP_KEY)"
            : "지도를 불러오지 못했어요"}
        </span>
      </div>
      {badge && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-ink/85 px-3 py-1.5 text-xs text-white">
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

// Minimal types for the Kakao Maps SDK we touch. The official package ships no
// types, and we'd rather not pull in @types/kakao for two constructors.
interface KakaoNamespace {
  maps: {
    load: (cb: () => void) => void;
    LatLng: new (lat: number, lng: number) => unknown;
    Map: new (el: HTMLElement, opts: { center: unknown; level: number }) => unknown;
    Marker: new (opts: { map: unknown; position: unknown; title?: string }) => unknown;
  };
}
