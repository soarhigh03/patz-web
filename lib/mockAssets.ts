import "server-only";
import fs from "node:fs";
import path from "node:path";

/** Extensions checked, in priority order. First match wins. */
const EXTENSIONS = ["jpeg", "jpg", "png", "webp", "gif"] as const;

/**
 * Given a basename relative to /public (e.g. "mockups/orrnnail/profile"),
 * returns the public URL of the first existing file with one of the supported
 * extensions, or undefined if none exist.
 *
 * Server-only — uses node:fs. Server components can call this directly; client
 * components should receive the resolved URL via props.
 */
export function resolveMockAsset(basename: string): string | undefined {
  const publicDir = path.join(process.cwd(), "public");
  for (const ext of EXTENSIONS) {
    const rel = `${basename}.${ext}`;
    const abs = path.join(publicDir, rel);
    if (fs.existsSync(abs)) return `/${rel}`;
  }
  return undefined;
}
