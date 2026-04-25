import Image from "next/image";
import Link from "next/link";
import type { Art } from "@/lib/types";

/**
 * Tile in the masonry feed (Image #3). Renders the art image when present,
 * a gray placeholder otherwise — placeholder height is driven by the seeded
 * `aspectRatio` so the masonry shape holds even before real images arrive.
 */
export function ArtTile({ art, href }: { art: Art; href: string }) {
  const ratio = art.aspectRatio ?? 1;
  return (
    <Link
      href={href}
      className="mb-3 block break-inside-avoid overflow-hidden rounded-md bg-neutral-200"
      style={{ aspectRatio: `${ratio}` }}
    >
      {art.imageUrl ? (
        <Image
          src={art.imageUrl}
          alt={art.name}
          width={400}
          height={Math.round(400 / ratio)}
          sizes="(max-width: 430px) 50vw, 215px"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-end p-2 text-[11px] text-muted">
          {art.name}
        </div>
      )}
    </Link>
  );
}
