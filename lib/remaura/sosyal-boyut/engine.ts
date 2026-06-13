/**
 * Sosyal Boyutlayıcı — görüntü motoru (çerçeveden bağımsız, tarayıcı/Canvas).
 *
 * Orijinal tek-dosya HTML aracın motoru buraya, DOM bağımlılığı olmadan taşındı.
 * Tüm ayarlar `RenderSettings` ile geçirilir → React UI ya da ileride mini-Canva
 * editörü aynı motoru kullanabilir. Yalnızca tarayıcıda çalışır (document/canvas).
 *
 * Not: PRO arka plan kaldırma artık sunucuda (Stability remove-bg) yapılır; bu modül
 * yalnızca hazır "özne" görselini (şeffaf PNG veya orijinal) tuvale yerleştirir.
 */

export type Layout = "fit" | "crop" | "blur";
export type GapFill = "smart" | "color" | "white" | "black";
export type BgMode = "orig" | "studio" | "gradient" | "custom";
export type Pos = "br" | "bl" | "tr" | "tl" | "c";

export type RenderSettings = {
  layout: Layout;
  gapFill: GapFill;
  fillColor: string;
  sharpen: boolean;
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  // PRO — arka plan yenileme (özne şeffaf PNG olarak verilir)
  pro: boolean;
  bgMode: BgMode;
  bgCustom: string;
  // logo
  logo: HTMLImageElement | null;
  logoPos: Pos;
  logoSize: number; // %4..40
  // metin filigranı
  textMark: boolean;
  wm1: string;
  wm2: string;
  wm3: string;
  wmColor: string;
  wmPos: Pos;
};

export type BorderStats = { color: string; rgb: [number, number, number]; varyans: number };

// ─── Yardımcılar ────────────────────────────────────────────────────────────────

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
}

export function borderStats(img: CanvasImageSource): BorderStats {
  const n = 64;
  const c = makeCanvas(n, n);
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0, n, n);
  const d = x.getImageData(0, 0, n, n).data;
  const px: [number, number, number][] = [];
  for (let i = 0; i < n; i++)
    for (const j of [0, n - 1]) {
      let p = (i * n + j) * 4;
      px.push([d[p], d[p + 1], d[p + 2]]);
      p = (j * n + i) * 4;
      px.push([d[p], d[p + 1], d[p + 2]]);
    }
  const med = [0, 1, 2].map((k) => {
    const s = px.map((v) => v[k]).sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }) as [number, number, number];
  const varyans =
    px.reduce((a, v) => a + Math.abs(v[0] - med[0]) + Math.abs(v[1] - med[1]) + Math.abs(v[2] - med[2]), 0) / px.length;
  return { color: `rgb(${med[0]},${med[1]},${med[2]})`, rgb: med, varyans };
}

function hex2rgb(h: string): [number, number, number] {
  h = h.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lumOf(r: number, g: number, b: number): number {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function kontrast(l1: number, l2: number): number {
  const a = Math.max(l1, l2),
    b = Math.min(l1, l2);
  return (a + 0.05) / (b + 0.05);
}
function aydinlat(rgb: number[], f: number): string {
  return `rgb(${rgb.map((v) => Math.min(255, Math.round(v + (255 - v) * f))).join(",")})`;
}
function karart(rgb: number[], f: number): string {
  return `rgb(${rgb.map((v) => Math.round(v * (1 - f))).join(",")})`;
}

export function hqScale(img: CanvasImageSource, tw: number, th: number): HTMLCanvasElement {
  let sw = (img as HTMLImageElement).width,
    sh = (img as HTMLImageElement).height;
  let src: CanvasImageSource = img;
  while (sw * 0.5 > tw && sh * 0.5 > th) {
    const c = makeCanvas(sw / 2, sh / 2);
    const cx = c.getContext("2d")!;
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = "high";
    cx.drawImage(src, 0, 0, c.width, c.height);
    src = c;
    sw = c.width;
    sh = c.height;
  }
  const out = makeCanvas(tw, th);
  const ox = out.getContext("2d")!;
  ox.imageSmoothingEnabled = true;
  ox.imageSmoothingQuality = "high";
  ox.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

function sharpen(c: HTMLCanvasElement, a: number): void {
  const x = c.getContext("2d")!;
  const W = c.width,
    H = c.height;
  const id = x.getImageData(0, 0, W, H),
    d = id.data,
    out = new Uint8ClampedArray(d);
  const k = 1 + 4 * a,
    R = W * 4;
  for (let y = 1; y < H - 1; y++) {
    let p = (y * W + 1) * 4;
    for (let xx = 1; xx < W - 1; xx++, p += 4) {
      out[p] = k * d[p] - a * (d[p - 4] + d[p + 4] + d[p - R] + d[p + R]);
      out[p + 1] = k * d[p + 1] - a * (d[p - 3] + d[p + 5] + d[p + 1 - R] + d[p + 1 + R]);
      out[p + 2] = k * d[p + 2] - a * (d[p - 2] + d[p + 6] + d[p + 2 - R] + d[p + 2 + R]);
    }
  }
  x.putImageData(new ImageData(out, W, H), 0, 0);
}

function featheredImage(
  img: CanvasImageSource,
  w: number,
  h: number,
  fL: number,
  fR: number,
  fT: number,
  fB: number,
): HTMLCanvasElement {
  const t = makeCanvas(Math.ceil(w), Math.ceil(h));
  const tx = t.getContext("2d")!;
  tx.drawImage(img, 0, 0, w, h);
  tx.globalCompositeOperation = "destination-in";
  const mask = (x0: number, y0: number, x1: number, y1: number) => {
    const g = tx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    tx.fillStyle = g;
    tx.fillRect(0, 0, t.width, t.height);
  };
  if (fL > 0) mask(0, 0, fL, 0);
  if (fR > 0) mask(t.width, 0, t.width - fR, 0);
  if (fT > 0) mask(0, 0, 0, fT);
  if (fB > 0) mask(0, t.height, 0, t.height - fB);
  return t;
}

function anchor(pos: Pos, W: number, H: number, m: number) {
  return {
    ax: pos === "bl" || pos === "tl" ? m : pos === "c" ? W / 2 : W - m,
    align: (pos === "bl" || pos === "tl" ? "left" : pos === "c" ? "center" : "right") as CanvasTextAlign,
    top: pos === "tl" || pos === "tr",
  };
}

function drawLogo(x: CanvasRenderingContext2D, s: RenderSettings, W: number, H: number): void {
  if (!s.logo) return;
  const lw = W * (s.logoSize / 100);
  const lh = (lw * s.logo.height) / s.logo.width,
    m = W * 0.03;
  let lx = W - lw - m,
    ly = H - lh - m;
  if (s.logoPos === "tr") ly = m;
  if (s.logoPos === "bl") lx = m;
  if (s.logoPos === "tl") {
    lx = m;
    ly = m;
  }
  if (s.logoPos === "c") {
    lx = (W - lw) / 2;
    ly = (H - lh) / 2;
  }
  x.globalAlpha = 0.92;
  x.drawImage(s.logo, lx, ly, lw, lh);
  x.globalAlpha = 1;
}

function drawTextMark(x: CanvasRenderingContext2D, s: RenderSettings, W: number, H: number): void {
  const t1 = s.wm1.trim(),
    t2 = s.wm2.trim(),
    t3 = s.wm3.trim();
  const markaHex = s.wmColor,
    pos = s.wmPos;
  const m = Math.round(Math.min(W, H) * 0.04);
  const s1 = Math.round(W * 0.042),
    sA = Math.round(W * 0.021),
    sB = Math.round(W * 0.019);
  const { ax, align, top } = anchor(pos, W, H, m);
  const rw = Math.min(W, Math.round(W * 0.45)),
    rh = Math.min(H, Math.round((s1 + sA + sB) * 2.4));
  const rx = align === "left" ? 0 : align === "center" ? Math.round((W - rw) / 2) : W - rw;
  const ry = top ? 0 : Math.max(0, H - rh);
  const d = x.getImageData(rx, ry, rw, rh).data;
  let r = 0,
    g = 0,
    b = 0,
    k = 0;
  for (let i = 0; i < d.length; i += 16) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
    k++;
  }
  const Lfon = lumOf(r / k, g / k, b / k);
  let secilen = markaHex;
  if (kontrast(lumOf(...hex2rgb(markaHex)), Lfon) < 3.2) {
    secilen = ["#f8f3ea", "#45331e"].sort(
      (a, c2) => kontrast(lumOf(...hex2rgb(c2)), Lfon) - kontrast(lumOf(...hex2rgb(a)), Lfon),
    )[0];
  }
  const altRenk = secilen === markaHex && kontrast(lumOf(90, 90, 90), Lfon) >= 2.6 ? "#5a5a5a" : secilen;
  x.save();
  x.textAlign = align;
  const cizgiler = [
    t1 && { t: t1, f: `bold ${s1}px Georgia, "Times New Roman", serif`, c: secilen, a: 0.96, s: s1 },
    t2 && { t: t2, f: `italic ${sA}px Georgia, "Times New Roman", serif`, c: altRenk, a: 0.85, s: sA },
    t3 && { t: t3, f: `${sB}px Georgia, "Times New Roman", serif`, c: secilen, a: 0.9, s: sB },
  ].filter(Boolean) as { t: string; f: string; c: string; a: number; s: number }[];
  const toplamH = cizgiler.reduce((a, l) => a + l.s * 1.6, 0);
  let y =
    top
      ? m + (cizgiler[0] ? cizgiler[0].s : 0)
      : pos === "c"
        ? (H - toplamH) / 2 + (cizgiler[0] ? cizgiler[0].s : 0)
        : H - m - toplamH + (cizgiler[0] ? cizgiler[0].s : 0);
  cizgiler.forEach((l) => {
    x.globalAlpha = l.a;
    x.fillStyle = l.c;
    x.font = l.f;
    x.fillText(l.t, ax, y);
    y += Math.round(l.s * 1.7);
  });
  x.restore();
}

// ─── Ana render ───────────────────────────────────────────────────────────────

export type RenderInput = {
  /** Yerleştirilecek özne: PRO'da şeffaf PNG kesim, değilse orijinal görsel */
  image: HTMLImageElement | HTMLCanvasElement;
  /** Orijinal görselin kenar istatistikleri (fon tonu / akıllı dolgu için) */
  stats: BorderStats;
  width: number;
  height: number;
  settings: RenderSettings;
};

export function renderFormat({ image, stats, width: W, height: H, settings: S }: RenderInput): HTMLCanvasElement {
  const c = makeCanvas(W, H);
  const x = c.getContext("2d")!;
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  const keskin = S.sharpen;
  const iw = (image as HTMLImageElement).width,
    ih = (image as HTMLImageElement).height;

  if (S.pro) {
    // arka plan yenilenmiş: tuval komple yeni zemin + kesik ürün
    if (S.bgMode === "gradient") {
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, aydinlat(stats.rgb, 0.18));
      g.addColorStop(1, karart(stats.rgb, 0.06));
      x.fillStyle = g;
    } else {
      x.fillStyle = S.bgMode === "studio" ? "#d9dbde" : S.bgMode === "custom" ? S.bgCustom : stats.color;
    }
    x.fillRect(0, 0, W, H);
    const s = Math.min(W / iw, H / ih) * 0.94,
      w = iw * s,
      h = ih * s;
    const fitted = hqScale(image, w, h);
    if (keskin && s < 0.9) sharpen(fitted, 0.22);
    x.drawImage(fitted, (W - w) / 2, (H - h) / 2);
  } else if (S.layout === "crop") {
    const s = Math.max(W / iw, H / ih),
      w = iw * s,
      h = ih * s;
    const fitted = hqScale(image, w, h);
    if (keskin && s < 0.9) sharpen(fitted, 0.22);
    x.drawImage(fitted, (W - w) / 2, (H - h) / 2);
  } else {
    let fm: string =
      S.layout === "blur"
        ? "blur"
        : ({ smart: "akilli", color: "manual", white: "white", black: "black" } as Record<string, string>)[S.gapFill];
    if (fm === "akilli") fm = stats.varyans < 40 ? "flat" : "blur";
    if (fm === "blur") {
      const s = Math.max(W / iw, H / ih) * 1.15,
        w = iw * s,
        h = ih * s;
      x.filter = `blur(${Math.max(20, Math.round(Math.min(W, H) * 0.05))}px) brightness(1.02)`;
      x.drawImage(image, (W - w) / 2, (H - h) / 2, w, h);
      x.filter = "none";
    } else {
      x.fillStyle =
        fm === "flat" ? stats.color : fm === "white" ? "#ffffff" : fm === "black" ? "#000000" : S.fillColor;
      x.fillRect(0, 0, W, H);
    }
    const s = Math.min(W / iw, H / ih),
      w = iw * s,
      h = ih * s;
    const dx = (W - w) / 2,
      dy = (H - h) / 2;
    const fitted = hqScale(image, w, h);
    if (keskin && s < 0.9) sharpen(fitted, 0.22);
    if (fm === "blur") {
      const F = Math.round(Math.min(W, H) * 0.06);
      const fimg = featheredImage(
        fitted,
        w,
        h,
        dx > 2 ? Math.min(F, w / 4) : 0,
        dx > 2 ? Math.min(F, w / 4) : 0,
        dy > 2 ? Math.min(F, h / 4) : 0,
        dy > 2 ? Math.min(F, h / 4) : 0,
      );
      x.drawImage(fimg, dx, dy);
    } else {
      x.drawImage(fitted, dx, dy);
    }
  }

  // ince ayar — tüm kompozisyona; filigran/logo SONRA basılır, etkilenmez
  const b = S.brightness,
    k2 = S.contrast,
    s2 = S.saturation;
  if (b || k2 || s2) {
    const tmp = makeCanvas(W, H);
    tmp.getContext("2d")!.drawImage(c, 0, 0);
    x.clearRect(0, 0, W, H);
    x.filter = `brightness(${100 + b * 0.3}%) contrast(${100 + k2 * 0.3}%) saturate(${100 + s2 * 0.5}%)`;
    x.drawImage(tmp, 0, 0);
    x.filter = "none";
  }

  drawLogo(x, S, W, H);
  if (S.textMark) drawTextMark(x, S, W, H);
  return c;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob_failed"))), type, quality),
  );
}
