// Shrinks large phone photos in the browser before upload: faster on mobile data and
// within serverless request limits. Keeps enough resolution for handwriting to stay legible.

const TARGET_BYTES = 1.8 * 1024 * 1024;

async function encode(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff"; // flatten transparency for JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Returns the original file if it's already small or can't be processed. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= TARGET_BYTES || typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    for (const [side, q] of [
      [2400, 0.85],
      [2000, 0.8],
      [1600, 0.75],
    ] as const) {
      const blob = await encode(bitmap, side, q);
      if (blob && blob.size <= TARGET_BYTES) {
        bitmap.close();
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
      }
    }
    bitmap.close();
  } catch {
    // fall through — the server will validate size and type
  }
  return file;
}
