import Image from "next/image";
import Link from "next/link";
import type { Art } from "@/lib/types";

/**
 * Tile in the 2-column feed. Renders the art image at the column's full width,
 * with height derived from the image's natural aspect ratio.
 * - When dimensions are known (mock data): next/image with width/height (no CLS).
 * - When only URL exists (DB / Storage): plain <img> so the browser resolves
 *   the natural ratio automatically.
 * - No image at all: square gray placeholder.
 */
export function ArtTile({ art, href }: { art: Art; href: string }) {
  return (
    <Link
      href={href}
      className="relative block overflow-hidden rounded-md bg-neutral-200"
    >
      {art.imageUrl && art.imageWidth && art.imageHeight ? (
        <Image
          src={art.imageUrl}
          alt={art.name}
          width={art.imageWidth}
          height={art.imageHeight}
          sizes="(max-width: 430px) 50vw, 215px"
          className="block h-auto w-full"
        />
      ) : art.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={art.imageUrl}
          alt={art.name}
          className="block h-auto w-full"
        />
      ) : (
        <div className="flex aspect-square w-full items-end p-2 text-[11px] text-muted">
          {art.name}
        </div>
      )}
      {art.isThisMonth && (
        <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-medium text-white">
          이달의 아트
        </span>
      )}
    </Link>
  );
}
