/*
 * FOTO MOTORU — telefon fotoğrafını satışa hazır ürün fotoğrafına çeviren
 * deterministik boru hattı. Çerçeveden bağımsız (saf TS + Canvas), tamamen
 * tarayıcıda çalışır; API maliyeti sıfır. Mezuniyet günü olduğu gibi taşınır.
 *
 * Boru hattı: beyaz dengesi → pozlama/ton eğrisi → gürültü → keskinlik
 *             → kesim (ayrı modül) → kenar temizliği → sahne (zemin+gölge)
 *             → metal tonu (sadece ürün maskesi içinde, parlaklık ağırlıklı)
 */

export type BackdropKey = "white" | "gray" | "black" | "transparent";

export type MetalToneKey =
  | "none"
  | "yellow-gold"
  | "rose-gold"
  | "white-gold"
  | "silver"
  | "platinum"
  | "bronze"
  | "oxidized";

export type EnhanceSettings = {
  /** -100..100 — 0 = otomatik pozlamaya dokunma */
  exposure: number;
  /** 0..100 */
  sharpness: number;
  /** 0..100 */
  denoise: number;
};

export type MetalSettings = {
  tone: MetalToneKey;
  /** 0..100 */
  intensity: number;
};

// Hedef ton = "şu renge çek" (Kimi'nin hue-kaydırmasının aksine mutlak hedef;
// böylece farklı beyaz dengelerinden gelen fotoğraflar aynı tona oturur).
const METAL_TARGETS: Record<Exclude<MetalToneKey, "none">, { hue: number; sat: number; lightShift: number }> = {
  "yellow-gold": { hue: 46 / 360, sat: 0.52, lightShift: 0.02 },
  "rose-gold": { hue: 16 / 360, sat: 0.34, lightShift: 0.02 },
  "white-gold": { hue: 46 / 360, sat: 0.05, lightShift: 0.03 },
  silver: { hue: 210 / 360, sat: 0.04, lightShift: 0.04 },
  platinum: { hue: 220 / 360, sat: 0.02, lightShift: 0.02 },
  bronze: { hue: 29 / 360, sat: 0.48, lightShift: -0.02 },
  oxidized: { hue: 215 / 360, sat: 0.06, lightShift: -0.14 },
};

export const METAL_TONE_LABELS: Record<MetalToneKey, string> = {
  none: "Orijinal",
  "yellow-gold": "Sarı Altın",
  "rose-gold": "Rose Altın",
  "white-gold": "Beyaz Altın",
  silver: "Gümüş",
  platinum: "Platin",
  bronze: "Bronz",
  oxidized: "Oksitli",
};

// ── Yardımcılar ──────────────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

const lumOf = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function make2d(width: number, height: number): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas 2d desteklenmiyor");
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

// ── Otomatik analiz ──────────────────────────────────────────────────────────

export type AutoAnalysis = {
  wbGains: [number, number, number];
  exposureGain: number;
};

/**
 * Gray-world beyaz dengesi (orta tonlardan) + persentil tabanlı pozlama.
 * Telefon fotoğraflarının iki ana kusurunu (renk sapması + sönük pozlama)
 * fotoğrafın kendisinden ölçer.
 */
export function analyzeImage(imgData: ImageData): AutoAnalysis {
  const d = imgData.data;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  const lums: number[] = [];

  // Örnekleme: her 4. piksel yeterli istatistik verir
  for (let i = 0; i < d.length; i += 16) {
    if (d[i + 3] < 200) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = lumOf(r, g, b);
    lums.push(lum);
    if (lum > 50 && lum < 215) {
      rSum += r;
      gSum += g;
      bSum += b;
      count++;
    }
  }

  let wbGains: [number, number, number] = [1, 1, 1];
  if (count > 100) {
    const rAvg = rSum / count;
    const gAvg = gSum / count;
    const bAvg = bSum / count;
    const gray = (rAvg + gAvg + bAvg) / 3;
    // temizlik hissi için ölçülü: renk sapmasını düzelt ama fotoğrafı "yeniden çekme"
    const clampGain = (v: number) => Math.min(1.18, Math.max(0.85, v));
    wbGains = [clampGain(gray / rAvg), clampGain(gray / gAvg), clampGain(gray / bAvg)];
  }

  let exposureGain = 1;
  if (lums.length > 100) {
    lums.sort((a, b) => a - b);
    const p995 = lums[Math.floor(lums.length * 0.995)];
    exposureGain = Math.min(1.35, Math.max(0.95, 242 / Math.max(60, p995)));
  }

  return { wbGains, exposureGain };
}

// ── Temel iyileştirme (WB + pozlama + kontrast eğrisi) ───────────────────────

export function applyBaseEnhance(
  imgData: ImageData,
  analysis: AutoAnalysis,
  settings: EnhanceSettings
): void {
  const d = imgData.data;
  const [gr, gg, gb] = analysis.wbGains;
  const userExposure = 1 + (settings.exposure / 100) * 0.45;
  const gain = analysis.exposureGain * userExposure;
  const contrastMix = 0.18; // yumuşak S-eğrisi karışım oranı (temizlik hissi: ölçülü)

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    for (let c = 0; c < 3; c++) {
      const g = c === 0 ? gr : c === 1 ? gg : gb;
      let v = d[i + c] * g * gain;
      // parlak uçta yumuşak sıkıştırma (patlamayı önler)
      if (v > 232) v = 232 + (v - 232) * 0.35;
      // yumuşak S-eğrisi (kontrast)
      const t = Math.min(1, Math.max(0, v / 255));
      const s = t * t * (3 - 2 * t);
      v = 255 * (t * (1 - contrastMix) + s * contrastMix);
      d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
}

// ── Gürültü azaltma (kenar koruyan) ──────────────────────────────────────────

export function applyDenoise(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0) return;
  const { width, height } = ctx.canvas;
  const blurCtx = make2d(width, height);
  blurCtx.filter = "blur(1.2px)";
  blurCtx.drawImage(ctx.canvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const blurData = blurCtx.getImageData(0, 0, width, height).data;
  const d = imgData.data;
  const maxBlend = Math.min(0.85, (amount / 100) * 0.85);
  const edgeThreshold = 26;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const edge =
      Math.abs(d[i] - blurData[i]) +
      Math.abs(d[i + 1] - blurData[i + 1]) +
      Math.abs(d[i + 2] - blurData[i + 2]);
    if (edge < edgeThreshold) {
      const w = maxBlend * (1 - edge / edgeThreshold);
      d[i] = d[i] * (1 - w) + blurData[i] * w;
      d[i + 1] = d[i + 1] * (1 - w) + blurData[i + 1] * w;
      d[i + 2] = d[i + 2] * (1 - w) + blurData[i + 2] * w;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ── Keskinleştirme (unsharp mask) ────────────────────────────────────────────

export function applySharpen(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0) return;
  const { width, height } = ctx.canvas;
  const blurCtx = make2d(width, height);
  blurCtx.filter = "blur(1.4px)";
  blurCtx.drawImage(ctx.canvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const blurData = blurCtx.getImageData(0, 0, width, height).data;
  const d = imgData.data;
  const strength = (amount / 100) * 0.9;

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;
    // alfa ağırlığı: opak bölgede birebir aynı, yarı saydam kenarlarda
    // overshoot kısılır (renk saçağı/parıltı önlenir)
    const edgeWeight = strength * (a / 255);
    for (let c = 0; c < 3; c++) {
      const v = d[i + c] + (d[i + c] - blurData[i + c]) * edgeWeight;
      d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ── Metal tonu (yalnız ürün pikselleri, parlaklık ağırlıklı) ────────────────

export function applyMetalTone(imgData: ImageData, metal: MetalSettings): void {
  if (metal.tone === "none" || metal.intensity <= 0) return;
  const target = METAL_TARGETS[metal.tone];
  const d = imgData.data;
  const intensity = metal.intensity / 100;

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 40) continue; // sadece ürün — zemin/şeffaf alan boyanmaz
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = lumOf(r, g, b);
    // parlaklık bandı: koyu gölgeler ve patlamış parlaklar az etkilenir
    // (taşların koyu/çok parlak bölgeleri korunur)
    let band = 0;
    if (lum > 55 && lum < 240) {
      band = lum < 120 ? (lum - 55) / 65 : lum > 200 ? (240 - lum) / 40 : 1;
    }
    const w = intensity * band * (a / 255);
    if (w <= 0.01) continue;

    const [, s, l] = rgbToHsl(r, g, b);
    const newSat = s * (1 - w * 0.7) + target.sat * (w * 0.7);
    const newLight = Math.min(0.97, Math.max(0.03, l + target.lightShift * w));
    const [nr, ng, nb] = hslToRgb(target.hue, newSat, newLight);
    d[i] = r * (1 - w) + nr * w;
    d[i + 1] = g * (1 - w) + ng * w;
    d[i + 2] = b * (1 - w) + nb * w;
  }
}

// ── Kenar temizliği (kesim sonrası halo giderme) ─────────────────────────────

export function defringeAlpha(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  const src = new Uint8ClampedArray(d.length);
  src.set(d);

  // Yapı-farkında 1px alfa erozyonu: kenardaki yarı saydam halo daralır.
  // İSTİSNA: piksel bir "tel" üzerindeyse (karşılıklı komşu çiftinin ikisi de
  // dolu) erozyondan muaf — telkari/sorguç gibi 1-3px yapılar silinmez.
  // Haloda dışa bakan komşu daima ~0 olduğundan halo yine temizlenir.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4 + 3;
      const a = src[idx];
      if (a === 0 || a === 255) continue;
      const up = src[idx - width * 4];
      const down = src[idx + width * 4];
      const left = src[idx - 4];
      const right = src[idx + 4];
      const onStrand = (up >= 100 && down >= 100) || (left >= 100 && right >= 100);
      if (!onStrand) {
        d[idx] = Math.min(a, up, down, left, right);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ── Sahne kompozisyonu (zemin + kontakt gölge) ───────────────────────────────

export type FrameMode = "original" | "studio";

export type SceneOptions = {
  backdrop: BackdropKey;
  shadow: boolean;
  /** original: ürün yerinde kalır (temizlik hissi); studio: kırp + ortala */
  frame: FrameMode;
};

function paintBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, backdrop: BackdropKey): void {
  if (backdrop === "transparent") return;
  if (backdrop === "white") {
    // beyaz sonsuz fon: üstte hafif gri, ürün arkasında aydınlık havuz
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ececec");
    g.addColorStop(0.55, "#f8f8f8");
    g.addColorStop(1, "#e9e9e9");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const pool = ctx.createRadialGradient(w / 2, h * 0.44, 0, w / 2, h * 0.44, Math.max(w, h) * 0.5);
    pool.addColorStop(0, "rgba(255,255,255,0.9)");
    pool.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, w, h);
  } else if (backdrop === "gray") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#cfcfcf");
    g.addColorStop(0.6, "#9a9a9a");
    g.addColorStop(1, "#5f5f5f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    const g = ctx.createRadialGradient(w / 2, h * 0.32, 0, w / 2, h * 0.5, Math.max(w, h) * 0.72);
    g.addColorStop(0, "#343434");
    g.addColorStop(0.55, "#141414");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

/**
 * Ürünün alfa siluetinden gerçek kontakt gölge üretir: silüet dikeyde
 * ezilir, bulanıklaştırılır ve ürünün tabanına yerleştirilir. Kimi'nin
 * ctx.shadowBlur yaklaşımının aksine gölge ürünün gerçek şeklini taşır.
 */
function paintContactShadow(
  ctx: CanvasRenderingContext2D,
  product: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  backdrop: BackdropKey
): void {
  const sil = make2d(product.width, product.height);
  sil.drawImage(product, 0, 0);
  sil.globalCompositeOperation = "source-in";
  sil.fillStyle = "#000";
  sil.fillRect(0, 0, product.width, product.height);

  const shadowH = h * 0.16;
  const baseY = y + h;
  ctx.save();
  ctx.filter = `blur(${Math.max(4, w * 0.03)}px)`;
  ctx.globalAlpha = backdrop === "black" ? 0.55 : backdrop === "gray" ? 0.32 : 0.25;
  ctx.drawImage(sil.canvas, x + w * 0.02, baseY - shadowH * 0.45, w * 0.96, shadowH);
  ctx.restore();
}

function findProductBBox(product: HTMLCanvasElement): { minX: number; minY: number; bw: number; bh: number } {
  const pctx = product.getContext("2d", { willReadFrequently: true })!;
  const { width: pw, height: ph } = product;
  const alpha = pctx.getImageData(0, 0, pw, ph).data;
  let minX = pw;
  let minY = ph;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < ph; y += 2) {
    for (let x = 0; x < pw; x += 2) {
      if (alpha[(y * pw + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return { minX: 0, minY: 0, bw: pw, bh: ph };
  }
  return { minX, minY, bw: maxX - minX, bh: maxY - minY };
}

/**
 * Kesilmiş ürünü sahneye oturtur.
 * - "original" kadraj: ürün YERİNDE kalır, yalnız zemin değişir — temizlik hissi;
 *   önce/sonra karşılaştırması piksel piksel hizalı olur.
 * - "studio" kadraj: ürün kırpılır, kare tuvale ortalanır (%82 doluluk).
 */
export function composeScene(product: HTMLCanvasElement, options: SceneOptions): HTMLCanvasElement {
  const { minX, minY, bw, bh } = findProductBBox(product);

  if (options.frame === "original") {
    const ctx = make2d(product.width, product.height);
    paintBackdrop(ctx, product.width, product.height, options.backdrop);

    if (options.shadow && options.backdrop !== "transparent") {
      const cropped = make2d(bw, bh);
      cropped.drawImage(product, minX, minY, bw, bh, 0, 0, bw, bh);
      paintContactShadow(ctx, cropped.canvas, minX, minY, bw, bh, options.backdrop);
    }

    ctx.drawImage(product, 0, 0);
    return ctx.canvas;
  }

  const size = Math.ceil(Math.max(bw, bh) / 0.82);
  const ctx = make2d(size, size);

  paintBackdrop(ctx, size, size, options.backdrop);

  // koordinatlar tam sayı: kesirli çizim yarım-piksel bulanıklık üretir
  const scale = Math.min((size * 0.82) / bw, (size * 0.82) / bh);
  const dw = Math.round(bw * scale);
  const dh = Math.round(bh * scale);
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round(
    (size - dh) / 2 - (options.shadow && options.backdrop !== "transparent" ? size * 0.02 : 0)
  );

  if (options.shadow && options.backdrop !== "transparent") {
    const cropped = make2d(bw, bh);
    cropped.drawImage(product, minX, minY, bw, bh, 0, 0, bw, bh);
    paintContactShadow(ctx, cropped.canvas, dx, dy, dw, dh, options.backdrop);
  }

  ctx.drawImage(product, minX, minY, bw, bh, dx, dy, dw, dh);
  return ctx.canvas;
}

// ── Dışa aktarım ─────────────────────────────────────────────────────────────

export function exportScene(
  scene: HTMLCanvasElement,
  width: number,
  height: number,
  format: "png" | "jpg"
): string {
  const ctx = make2d(width, height);
  if (format === "jpg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  const scale = Math.min(width / scene.width, height / scene.height);
  const dw = scene.width * scale;
  const dh = scene.height * scale;
  ctx.drawImage(scene, (width - dw) / 2, (height - dh) / 2, dw, dh);
  return ctx.canvas.toDataURL(format === "png" ? "image/png" : "image/jpeg", 0.95);
}
