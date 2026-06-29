import type { MeshAnalysis, MetalWeight } from "./meshOps";

type CardInput = {
  modelImg: string | null;       // viewer snapshot (PNG dataURL)
  analysis: MeshAnalysis;
  weight: MetalWeight;
  fileName?: string;
  hollowed?: boolean;            // false = dolu (içi boşaltılmamış), true = içi boşaltılmış
};

const ROSE = "#b76e79";
const ROSE_LT = "#e6b3bb";
const GOLD = "#c9a227";
const PANEL = "rgba(255,255,255,0.035)";
const BORDER = "rgba(255,255,255,0.10)";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Etsy ürün görseli (2000×2000) üretir: model anlık görüntüsü + tüm rapor değerleri.
 * Döndürdüğü PNG dataURL doğrudan e-ticarete yüklenebilir.
 */
export async function buildEtsyCard({ modelImg, analysis, weight, fileName, hollowed = false }: CardInput): Promise<string> {
  const S = 2000;
  const canvas = document.createElement("canvas");
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // --- Mermer / taş zemin (lüks algı: kalite + şıklık + sağlamlık) ---
  let _seed = 0x9e3779b9; // sabit tohum → her seferinde aynı desen
  const rand = () => {
    _seed = (_seed + 0x6d2b79f5) | 0;
    let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const base = ctx.createLinearGradient(0, 0, S, S);
  base.addColorStop(0, "#0c0d12");
  base.addColorStop(0.5, "#131419");
  base.addColorStop(1, "#0a0b0e");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  // mermer benekleri (yumuşak bulutlanma)
  for (let i = 0; i < 7; i++) {
    const x = rand() * S, y = rand() * S, r = 320 + rand() * 540;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(255,255,255,${(0.010 + rand() * 0.018).toFixed(4)})`);
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, S, S);
  }

  // mermer damarları (altın + gül + fildişi, yumuşak)
  ctx.save();
  const veinCols = ["rgba(201,162,39,0.10)", "rgba(230,179,187,0.09)", "rgba(245,243,240,0.055)"];
  for (let v = 0; v < 16; v++) {
    ctx.beginPath();
    let x = rand() * S, y = -60;
    ctx.moveTo(x, y);
    const steps = 9, dy = (S + 120) / steps;
    for (let s = 0; s < steps; s++) {
      const nx = x + (rand() - 0.5) * 460, ny = y + dy;
      ctx.quadraticCurveTo((x + nx) / 2 + (rand() - 0.5) * 220, (y + ny) / 2, nx, ny);
      x = nx; y = ny;
    }
    const col = veinCols[v % veinCols.length];
    ctx.strokeStyle = col; ctx.lineWidth = 1 + rand() * 3.2;
    ctx.shadowColor = col; ctx.shadowBlur = 7;
    ctx.stroke();
  }
  ctx.restore();

  // üstte gül parıltısı
  const glow = ctx.createRadialGradient(S / 2, 280, 60, S / 2, 280, 1100);
  glow.addColorStop(0, "rgba(183,110,121,0.16)");
  glow.addColorStop(1, "rgba(183,110,121,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // kenar karartma (vignette) → ortadaki içerik öne çıkar
  const vg = ctx.createRadialGradient(S / 2, S / 2, S * 0.32, S / 2, S / 2, S * 0.78);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, S, S);

  // --- Çift çerçeve (mermer kakma kenarı: altın + gül hairline) ---
  ctx.strokeStyle = "rgba(201,162,39,0.38)"; ctx.lineWidth = 3;
  roundRect(ctx, 40, 40, S - 80, S - 80, 36); ctx.stroke();
  ctx.strokeStyle = "rgba(230,179,187,0.22)"; ctx.lineWidth = 1.5;
  roundRect(ctx, 60, 60, S - 120, S - 120, 28); ctx.stroke();

  // --- Başlık ---
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5f3f0";
  ctx.font = "600 92px Georgia, 'Times New Roman', serif";
  ctx.fillText("TREND MÜCEVHER", S / 2, 180);
  ctx.fillStyle = ROSE_LT;
  ctx.font = "400 38px Helvetica, Arial, sans-serif";
  ctx.fillText("Remaura AI · Üretime Hazır 3D Model", S / 2, 238);

  // --- Durum rozeti (kapalı VE normaller tutarlı = döküme hazır) ---
  const ok = analysis.productionReady;
  const badge = ok
    ? "✓  ÜRETİME / DÖKÜME HAZIR"
    : analysis.watertight
      ? "⚠  KAPALI · NORMALLER DÜZELTİLMELİ"
      : "⚠  ONARIM GEREKLİ";
  ctx.font = "700 34px Helvetica, Arial, sans-serif";
  const bw = ctx.measureText(badge).width + 80;
  const bx = (S - bw) / 2, by = 282;
  ctx.fillStyle = ok ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)";
  ctx.strokeStyle = ok ? "rgba(16,185,129,0.6)" : "rgba(245,158,11,0.6)";
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, bw, 64, 32);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = ok ? "#34d399" : "#fbbf24";
  ctx.fillText(badge, S / 2, by + 43);

  // --- Dolu / İçi boşaltılmış notu ---
  const fillNote = hollowed
    ? "İÇİ BOŞALTILMIŞ MODEL · azaltılmış metal ağırlığı"
    : "DOLU MODEL · içi boşaltılmamış · tam metal ağırlığı";
  ctx.fillStyle = hollowed ? GOLD : "rgba(245,243,240,0.55)";
  ctx.font = "600 28px Helvetica, Arial, sans-serif";
  ctx.fillText(fillNote, S / 2, by + 110);

  // --- Model görseli (kare çerçeve) ---
  const boxY = 430, boxSize = 980, boxX = (S - boxSize) / 2;
  ctx.fillStyle = "#05060a";
  roundRect(ctx, boxX, boxY, boxSize, boxSize, 28);
  ctx.fill();
  if (modelImg) {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = rej; i.src = modelImg;
    });
    ctx.save();
    roundRect(ctx, boxX + 6, boxY + 6, boxSize - 12, boxSize - 12, 24);
    ctx.clip();
    ctx.drawImage(img, boxX + 6, boxY + 6, boxSize - 12, boxSize - 12);
    ctx.restore();
  }
  ctx.strokeStyle = "rgba(183,110,121,0.45)";
  ctx.lineWidth = 2.5;
  roundRect(ctx, boxX, boxY, boxSize, boxSize, 28);
  ctx.stroke();

  // --- Spec panelleri (iki sütun) ---
  const panY = boxY + boxSize + 34;
  const panH = 440;
  const gap = 36;
  const panW = (boxSize - gap) / 2;
  const leftX = boxX, rightX = boxX + panW + gap;

  const drawPanel = (x: number, title: string, rows: [string, string][]) => {
    ctx.fillStyle = PANEL;
    ctx.strokeStyle = BORDER; ctx.lineWidth = 2;
    roundRect(ctx, x, panY, panW, panH, 24);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = ROSE;
    ctx.font = "700 30px Helvetica, Arial, sans-serif";
    ctx.fillText(title, x + 40, panY + 58);
    ctx.strokeStyle = BORDER; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 40, panY + 78); ctx.lineTo(x + panW - 40, panY + 78); ctx.stroke();
    const rowH = (panH - 110) / rows.length;
    rows.forEach((r, i) => {
      const ry = panY + 110 + rowH * i + rowH / 2;
      // etiket (sol)
      ctx.fillStyle = "rgba(245,243,240,0.55)";
      ctx.font = "400 30px Helvetica, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(r[0], x + 40, ry + 10);
      const labelW = ctx.measureText(r[0]).width;
      // değer (sağ) — etikete binmesin diye fontu daralt
      ctx.textAlign = "right";
      ctx.fillStyle = "#f5f3f0";
      const maxValW = panW - 80 - labelW - 24;
      let fs = 34;
      do {
        ctx.font = `600 ${fs}px 'Consolas', monospace`;
        if (ctx.measureText(r[1]).width <= maxValW || fs <= 20) break;
        fs -= 2;
      } while (true);
      ctx.fillText(r[1], x + panW - 40, ry + 11);
    });
  };

  const dim = analysis.dimensions.map((d) => d.toFixed(1)).join(" × ");
  drawPanel(leftX, "TEKNİK", [
    ["Hacim", `${weight.volumeMm3.toFixed(1)} mm³`],
    ["Üçgen", analysis.triangleCount.toLocaleString("tr-TR")],
    ["Parça / Shell", String(analysis.shellCount)],
    ["Boyut (mm)", dim],
  ]);
  drawPanel(rightX, "METAL AĞIRLIĞI", weight.weights.map((w) => [w.label, `${w.grams.toFixed(2)} g`]) as [string, string][]);

  // --- Footer ---
  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = "400 30px Georgia, serif";
  ctx.fillText("trendmucevher.com", S / 2, S - 70);
  if (fileName) {
    ctx.fillStyle = "rgba(245,243,240,0.30)";
    ctx.font = "400 22px Helvetica, Arial, sans-serif";
    ctx.fillText(fileName, S / 2, S - 36);
  }

  return canvas.toDataURL("image/png");
}
