import "server-only";
import fs from "node:fs";
import path from "node:path";
import imageSize from "image-size";

/** Extensions checked, in priority order. First match wins. */
const EXTENSIONS = ["jpeg", "jpg", "png", "webp", "gif"] as const;

export interface ResolvedAsset {
  /** URL relative to `/`, e.g. `/mockups/orrnnail/profile.png`. */
  url: string;
  /** Natural pixel width; undefined if image-size couldn't read it. */
  width?: number;
  /** Natural pixel height; undefined if image-size couldn't read it. */
  height?: number;
}

/**
 * Given a basename relative to `/public` (e.g. "mockups/orrnnail/profile"),
 * returns the URL + natural pixel dimensions of the first existing file with
 * one of the supported extensions, or undefined if none exist.
 *
 * Server-only — uses node:fs and image-size.
 */
export function resolveMockAsset(basename: string): ResolvedAsset | undefined {
  const publicDir = path.join(process.cwd(), "public");
  for (const ext of EXTENSIONS) {
    const rel = `${basename}.${ext}`;
    const abs = path.join(publicDir, rel);
    if (!fs.existsSync(abs)) continue;
    let width: number | undefined;
    let height: number | undefined;
    try {
      const dims = imageSize(abs);
      width = dims.width;
      height = dims.height;
    } catch {
      // Unreadable file — still return the URL so the browser can attempt to
      // load it; the consuming component can fall back to a square placeholder.
    }
    return { url: `/${rel}`, width, height };
  }
  return undefined;
}
