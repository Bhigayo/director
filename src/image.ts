// Shrinks photos before they're saved, so a 5 MB iPhone photo becomes a few hundred KB.

export const MAX_SIDE = 1800;

/** The size to draw an image at so its longest side is at most `max`, keeping its shape. */
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  try {
    // Respects the photo's rotation from the camera
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Returns a resized JPEG. Small files and anything that can't be decoded are kept as they are. */
export async function shrinkImage(file: Blob): Promise<Blob> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const { source, width, height } = await decode(file);
    const size = fitWithin(width, height);
    if (size.width === width && file.size < 600_000 && file.type === "image/jpeg") return file;
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; // transparent PNG mockups get a white background
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(source, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/**
 * The main colour of a garment photo. Looks at the middle of the picture (where the garment usually is),
 * ignores pixels that match the background around the edges, and averages the most common colour.
 */
export async function dominantColour(file: Blob): Promise<string | null> {
  try {
    const { source } = await decode(file);
    const S = 64;
    const canvas = document.createElement("canvas");
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, S, S);
    const px = ctx.getImageData(0, 0, S, S).data;
    return pickColour(px, S);
  } catch {
    return null;
  }
}

/** The colour-picking part of dominantColour, separate so it can be tested without a browser. */
export function pickColour(px: Uint8ClampedArray, S: number): string {
  const at = (x: number, y: number) => {
    const i = (y * S + x) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  };
  // Background: the average of the outer ring of pixels
  const ring: number[][] = [];
  for (let i = 0; i < S; i++) ring.push(at(i, 0), at(i, S - 1), at(0, i), at(S - 1, i));
  const bg = [0, 1, 2].map((c) => ring.reduce((n, p) => n + p[c], 0) / ring.length);
  const near = (p: number[], q: number[], d: number) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < d;

  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  const lo = Math.floor(S * 0.25);
  const hi = Math.ceil(S * 0.75);
  const add = (skipBackground: boolean) => {
    for (let y = lo; y < hi; y++)
      for (let x = lo; x < hi; x++) {
        const p = at(x, y);
        if (skipBackground && near(p, bg, 42)) continue;
        const key = ((p[0] >> 5) << 6) | ((p[1] >> 5) << 3) | (p[2] >> 5);
        const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
        b.n++;
        b.r += p[0];
        b.g += p[1];
        b.b += p[2];
        buckets.set(key, b);
      }
  };
  add(true);
  // If almost everything matched the background (a garment the same colour as the floor), use it all
  if ([...buckets.values()].reduce((n, b) => n + b.n, 0) < (hi - lo) ** 2 * 0.08) {
    buckets.clear();
    add(false);
  }
  const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${hex(top.r / top.n)}${hex(top.g / top.n)}${hex(top.b / top.n)}`;
}
