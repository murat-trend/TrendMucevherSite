/**
 * 2D görsel export'larında canvas üzerine Rem filigranı çizer (3D/mesh/STL için kullanılmaz).
 */
export async function applyWatermark(canvas: HTMLCanvasElement): Promise<void> {
  const img = new Image();
  img.src = "/rem-icon.png";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Watermark icon failed to load"));
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = canvas.width * 0.08;
  const margin = 12;
  const x = canvas.width - size - margin;
  const y = canvas.height - size - margin;

  ctx.globalAlpha = 0.72;
  ctx.drawImage(img, x, y, size, size);
  ctx.globalAlpha = 1.0;
}
