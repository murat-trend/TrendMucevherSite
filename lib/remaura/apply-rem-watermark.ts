/**
 * 2D görsel export'larında canvas üzerine "Trend Mücevher / by Murat Kaynaroğlu"
 * filigranı çizer (sağ alt köşe). 3D/mesh/STL export'ları için kullanılmaz.
 */
export function applyWatermark(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  const paddingX = Math.round(w * 0.025);
  const paddingY = Math.round(h * 0.025);
  const size1 = Math.max(18, Math.round(w * 0.026)); // "Trend Mücevher"
  const size2 = Math.max(12, Math.round(w * 0.016)); // "by Murat Kaynaroğlu"
  const size3 = Math.max(11, Math.round(w * 0.014)); // "trendmucevher.com"

  const x  = w - paddingX;
  const y3 = h - paddingY;
  const y2 = y3 - size3 * 1.5;
  const y1 = y2 - size2 * 1.5;

  ctx.save();
  ctx.textAlign    = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor  = "rgba(183,110,121,0.25)";
  ctx.shadowBlur   = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  ctx.font      = `700 ${size1}px Georgia, serif`;
  ctx.fillStyle = "#b76e79";
  ctx.fillText("Trend Mücevher", x, y1);

  ctx.font      = `400 ${size2}px Georgia, serif`;
  ctx.fillStyle = "rgba(183,110,121,0.8)";
  ctx.fillText("by Murat Kaynaroğlu", x, y2);

  ctx.font      = `400 ${size3}px sans-serif`;
  ctx.fillStyle = "rgba(183,110,121,0.65)";
  ctx.fillText("trendmucevher.com", x, y3);

  ctx.restore();
}
