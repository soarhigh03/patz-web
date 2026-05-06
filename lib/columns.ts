import type { Art } from "@/lib/types";

/**
 * Greedy algorithm: iterate arts in order, always assign to the shorter column.
 * Height is estimated from aspect ratio (imageHeight/imageWidth).
 * If dimensions are unknown, assume square (ratio = 1).
 */
export function splitIntoColumns(arts: Art[]): [Art[], Art[]] {
  const left: Art[] = [];
  const right: Art[] = [];
  let leftH = 0;
  let rightH = 0;

  for (const art of arts) {
    const ratio =
      art.imageWidth && art.imageHeight
        ? art.imageHeight / art.imageWidth
        : 1;

    if (leftH <= rightH) {
      left.push(art);
      leftH += ratio;
    } else {
      right.push(art);
      rightH += ratio;
    }
  }

  return [left, right];
}
