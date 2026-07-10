// DIŞA AKTARMA MOTORU — tarayıcıda gerçek render (canvas + MediaRecorder → WEBM).
// Görsel klipler + yazı overlay'leri + filigran + ses miksi tek geçişte çizilir.
// MP4/MOV sunucu render gerektirir; o yol API'de ayrı ele alınır.

import type { Asset, Project, TextOverlay } from "./types";
import { clipAt, projectDuration } from "./timeline-engine";
import { platformPreset } from "./constants";

const FPS = 30;

function assetById(assets: Asset[], id: string | null): Asset | undefined {
  return id ? assets.find((a) => a.id === id) : undefined;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi"));
    img.src = src;
  });
}

/** Görseli tuvale "cover" oturtur (oran bozulmaz, taşan kırpılır). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function overlayAlphaAndOffset(o: TextOverlay, t: number): { alpha: number; dx: number; dy: number; scale: number; chars: number } {
  const local = t - o.start;
  const p = Math.min(1, Math.max(0, local / Math.min(0.6, o.duration))); // giriş animasyonu ~0.6s
  switch (o.animation) {
    case "fade": return { alpha: p, dx: 0, dy: 0, scale: 1, chars: o.text.length };
    case "slide-up": return { alpha: p, dx: 0, dy: (1 - p) * 60, scale: 1, chars: o.text.length };
    case "slide-left": return { alpha: p, dx: (1 - p) * 80, dy: 0, scale: 1, chars: o.text.length };
    case "zoom": return { alpha: p, dx: 0, dy: 0, scale: 0.6 + 0.4 * p, chars: o.text.length };
    case "typewriter": return { alpha: 1, dx: 0, dy: 0, scale: 1, chars: Math.ceil(o.text.length * p) };
    default: return { alpha: 1, dx: 0, dy: 0, scale: 1, chars: o.text.length };
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  images: Map<string, HTMLImageElement>,
  logo: HTMLImageElement | null,
  t: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = "#0a0b0e";
  ctx.fillRect(0, 0, w, h);

  // Video track'leri sırayla (alttan üste) çizilir.
  for (const track of project.tracks.filter((tr) => tr.kind === "video")) {
    const clip = clipAt(track, t);
    const img = clip ? images.get(clip.assetId ?? "") : undefined;
    if (img) drawCover(ctx, img, w, h);
  }

  // Yazı overlay'leri.
  const scaleRef = h / 1080; // sizePx 1080p referanslı
  for (const o of project.overlays) {
    if (t < o.start || t > o.start + o.duration) continue;
    const anim = overlayAlphaAndOffset(o, t);
    ctx.save();
    ctx.globalAlpha = anim.alpha;
    ctx.font = `${o.fontWeight} ${Math.round(o.sizePx * scaleRef * anim.scale)}px "${o.fontFamily}", sans-serif`;
    ctx.fillStyle = o.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8 * scaleRef;
    ctx.fillText(o.text.slice(0, anim.chars), o.x * w + anim.dx * scaleRef, o.y * h + anim.dy * scaleRef);
    ctx.restore();
  }

  // Filigran / logo.
  const wm = project.brand.watermark;
  if (wm.enabled && (wm.text.trim() || logo)) {
    ctx.save();
    ctx.globalAlpha = wm.opacity;
    const pad = 24 * scaleRef;
    const pos = wm.position;
    const cx = pos === "orta" ? w / 2 : pos.includes("sag") ? w - pad : pad;
    const cy = pos === "orta" ? h / 2 : pos.includes("alt") ? h - pad : pad;
    if (logo) {
      const lw = Math.min(w * 0.18, logo.width);
      const lh = lw * (logo.height / logo.width);
      ctx.drawImage(logo, cx - (pos.includes("sag") ? lw : pos === "orta" ? lw / 2 : 0), cy - (pos.includes("alt") ? lh : pos === "orta" ? lh / 2 : 0), lw, lh);
    } else {
      ctx.font = `600 ${Math.round(28 * scaleRef)}px "${project.brand.fontFamily}", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = pos === "orta" ? "center" : pos.includes("sag") ? "right" : "left";
      ctx.textBaseline = pos === "orta" ? "middle" : pos.includes("alt") ? "bottom" : "top";
      ctx.fillText(wm.text, cx, cy);
    }
    ctx.restore();
  }
}

async function buildAudioStream(
  project: Project,
  durationSec: number,
): Promise<{ stream: MediaStream; ctx: AudioContext } | null> {
  const audioClips = project.tracks
    .filter((t) => t.kind === "audio")
    .flatMap((t) => t.clips)
    .filter((c) => assetById(project.assets, c.assetId)?.dataUrl);
  if (audioClips.length === 0) return null;

  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  for (const clip of audioClips) {
    const asset = assetById(project.assets, clip.assetId)!;
    const resp = await fetch(asset.dataUrl!);
    const buf = await ctx.decodeAudioData(await resp.arrayBuffer());
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const g = clip.gain ?? 1;
    const t0 = ctx.currentTime + clip.start;
    const tEnd = Math.min(t0 + clip.duration, ctx.currentTime + durationSec);
    gain.gain.setValueAtTime(clip.fadeIn ? 0 : g, t0);
    if (clip.fadeIn) gain.gain.linearRampToValueAtTime(g, t0 + clip.fadeIn);
    if (clip.fadeOut) {
      gain.gain.setValueAtTime(g, Math.max(t0, tEnd - clip.fadeOut));
      gain.gain.linearRampToValueAtTime(0, tEnd);
    }
    src.connect(gain).connect(dest);
    src.start(t0, clip.inPoint, Math.min(clip.duration, durationSec - clip.start));
  }
  return { stream: dest.stream, ctx };
}

export interface ExportProgress {
  /** 0–1 */
  progress: number;
}

/** Projeyi WEBM video Blob'una render eder. */
export async function exportWebm(
  project: Project,
  onProgress?: (p: ExportProgress) => void,
): Promise<Blob> {
  const duration = projectDuration(project.tracks);
  if (duration <= 0) throw new Error("Timeline boş — önce klip ekleyin.");

  const preset = platformPreset(project.platform);
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tuval oluşturulamadı.");

  // Kullanılan tüm görselleri önden yükle.
  const images = new Map<string, HTMLImageElement>();
  for (const track of project.tracks.filter((t) => t.kind === "video")) {
    for (const clip of track.clips) {
      const asset = assetById(project.assets, clip.assetId);
      if (asset?.dataUrl && !images.has(asset.id)) {
        images.set(asset.id, await loadImage(asset.dataUrl));
      }
    }
  }
  const logoAsset = assetById(project.assets, project.brand.logoAssetId);
  const logo = logoAsset?.dataUrl ? await loadImage(logoAsset.dataUrl) : null;

  const videoStream = canvas.captureStream(FPS);
  const audio = await buildAudioStream(project, duration);
  const stream = audio
    ? new MediaStream([...videoStream.getVideoTracks(), ...audio.stream.getAudioTracks()])
    : videoStream;

  const mime = ["video/webm;codecs=vp9,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error("Bu tarayıcı video dışa aktarmayı desteklemiyor.");

  return new Promise<Blob>((resolve, reject) => {
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onerror = () => reject(new Error("Kayıt sırasında hata oluştu."));
    recorder.onstop = () => {
      audio?.ctx.close().catch(() => undefined);
      resolve(new Blob(chunks, { type: "video/webm" }));
    };

    recorder.start(250);
    const startAt = performance.now();
    const tick = () => {
      const t = (performance.now() - startAt) / 1000;
      if (t >= duration) {
        drawFrame(ctx, project, images, logo, duration - 1 / FPS, canvas.width, canvas.height);
        onProgress?.({ progress: 1 });
        recorder.stop();
        return;
      }
      drawFrame(ctx, project, images, logo, t, canvas.width, canvas.height);
      onProgress?.({ progress: t / duration });
      requestAnimationFrame(tick);
    };
    tick();
  });
}
