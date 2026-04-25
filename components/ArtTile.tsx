import Image from "next/image";
import Link from "next/link";
import type { Art } from "@/lib/types";

/**
 * Tile in the 2-column feed (Image #3). Renders the art image at the column's
 * full width, with height derived from the image's natural aspect ratio (read
 * server-side via `image-size`). When the image isn't available yet, falls
 * back to a square gray placeholder.
 */
export function ArtTile({ art, href }: { art: Art; href: string }) {
  return (
    <Link href={href} className="block overflow-hidden rounded-md bg-neutral-200">
      {art.imageUrl && art.imageWidth && art.imageHeight ? (
        <Image
          src={art.imageUrl}
          alt={art.name}
          width={art.imageWidth}
          height={art.imageHeight}
          sizes="(max-width: 430px) 50vw, 215px"
          className="block h-auto w-full"
        />
      ) : (
        <div className="flex aspect-square w-full items-end p-2 text-[11px] text-muted">
          {art.name}
        </div>
      )}
    </Link>
  );
}
