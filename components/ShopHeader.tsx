import Image from "next/image";
import type { Shop } from "@/lib/types";

/**
 * Top-of-profile composite: full-bleed background image with a circular profile
 * image overlapping the bottom edge. Matches Image #1.
 */
export function ShopHeader({ shop }: { shop: Shop }) {
  return (
    <header className="relative">
      <div className="relative h-72 w-full overflow-hidden bg-neutral-200">
        {shop.backgroundImageUrl ? (
          <Image
            src={shop.backgroundImageUrl}
            alt=""
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-neutral-200 to-neutral-300" />
        )}
      </div>

      <div className="relative -mt-16 flex flex-col items-center px-6 pb-2">
        <div className="relative h-32 w-32 overflow-hidden rounded-full ring-4 ring-white bg-neutral-200">
          {shop.profileImageUrl ? (
            <Image
              src={shop.profileImageUrl}
              alt={`${shop.name} 프로필 이미지`}
              fill
              sizes="128px"
              className="object-cover"
            />
          ) : null}
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{shop.name}</h1>
        <p className="mt-1 text-sm text-muted">@{shop.handle}</p>
      </div>
    </header>
  );
}
