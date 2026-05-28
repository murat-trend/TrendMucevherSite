"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAKI_TIPI = ["Yüzük", "Kolye", "Küpe", "Bilezik", "Broş"] as const;
type TakiTipi = (typeof TAKI_TIPI)[number];

const FORM_KARAKTERLERI = [
  "İnce & Zarif",
  "Geometrik",
  "Organik",
  "Filigran",
  "Kabartmalı",
  "Asimetrik",
] as const;
type FormKarakteri = (typeof FORM_KARAKTERLERI)[number];

const METAL_RENGI = [
  { label: "Sarı Altın", hex: "#D4AF37" },
  { label: "Rose Gold", hex: "#B76E79" },
  { label: "Beyaz Altın", hex: "#E0E0E0" },
  { label: "Gümüş", hex: "#C0C0C0" },
  { label: "Oksitlenmiş Gümüş", hex: "#707070" },
] as const;
type MetalRengi = (typeof METAL_RENGI)[number]["label"];

const ACCENT = "#b76e79";
const ACCENT_LIGHT = "#c4838b";

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadState =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "op"; index: number; label: string }
  | { kind: "downloading"; index: number };

type Modal =
  | { type: "replace"; index: number; searchPrompt: string; replacePrompt: string }
  | { type: "recolor"; index: number; selectPrompt: string; colorPrompt: string };

// ─── Reusable UI pieces ───────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.35em",
        color: "rgba(255,255,255,0.35)",
      }}
    >
      {children}
    </span>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        color: "white",
        outline: "none",
        width: "100%",
        ...(props.style ?? {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(183,110,121,0.5)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        props.onBlur?.(e);
      }}
    />
  );
}

function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        color: "white",
        outline: "none",
        width: "100%",
        resize: "none",
        lineHeight: 1.6,
        ...(props.style ?? {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(183,110,121,0.5)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        props.onBlur?.(e);
      }}
    />
  );
}

function ChipBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        border: "1px solid",
        cursor: "pointer",
        transition: "all 0.15s",
        background: active ? "rgba(183,110,121,0.16)" : "rgba(255,255,255,0.03)",
        borderColor: active ? ACCENT : "rgba(255,255,255,0.08)",
        color: active ? ACCENT_LIGHT : "rgba(255,255,255,0.4)",
      }}
    >
      {children}
    </button>
  );
}

function ActionBtn({
  onClick,
  disabled,
  accent,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 8px",
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        border: "1px solid",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        background: accent ? "rgba(183,110,121,0.18)" : "rgba(255,255,255,0.04)",
        borderColor: accent ? ACCENT : "rgba(255,255,255,0.1)",
        color: accent ? ACCENT_LIGHT : "rgba(255,255,255,0.5)",
      }}
    >
      {children}
    </button>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${ACCENT}`,
        borderTopColor: "transparent",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function GridSkeleton() {
  return (
    <div style={{ maxWidth: 480 }}>
      {[0].map((i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              aspectRatio: "1",
              borderRadius: 12,
              background: "rgba(255,255,255,0.05)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              height: 24,
              borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KoleksiyonEditClient() {
  const { t } = useLanguage();
  const ke = t.koleksiyonEdit;

  // Display maps — keep internal state as Turkish keys (backend uses them)
  const takiDisplay: Record<TakiTipi, string> = {
    "Yüzük": ke.ringLabel,
    "Kolye": ke.necklaceLabel,
    "Küpe": ke.earringLabel,
    "Bilezik": ke.braceletLabel,
    "Broş": ke.broochLabel,
  };
  const metalDisplay: Record<MetalRengi, string> = {
    "Sarı Altın": ke.metalYellowGold,
    "Rose Gold": ke.metalRoseGold,
    "Beyaz Altın": ke.metalWhiteGold,
    "Gümüş": ke.metalSilver,
    "Oksitlenmiş Gümüş": ke.metalOxidized,
  };
  const formDisplay: Record<FormKarakteri, string> = {
    "İnce & Zarif": ke.formThin,
    "Geometrik": ke.formGeometric,
    "Organik": ke.formOrganic,
    "Filigran": ke.formFiligree,
    "Kabartmalı": ke.formEmbossed,
    "Asimetrik": ke.formAsymmetric,
  };

  // Form
  const [koleksiyonAdi, setKoleksiyonAdi] = useState("");
  const [takiTipi, setTakiTipi] = useState<TakiTipi>("Yüzük");
  const [tema, setTema] = useState("");
  const [formKarakterleri, setFormKarakterleri] = useState<FormKarakteri[]>([]);
  const [metalRengi, setMetalRengi] = useState<MetalRengi>("Sarı Altın");
  const [refBase64, setRefBase64] = useState<string | null>(null);
  const [refName, setRefName] = useState("");
  const [referansGucu, setReferansGucu] = useState(0.85);
  const [harfGirdisi, setHarfGirdisi] = useState("");
  const [varyasyonSayisi, setVaryasyonSayisi] = useState(1);

  // Stil kartı
  const [stilKartiModal, setStilKartiModal] = useState(false);
  const [stilKartiIsim, setStilKartiIsim] = useState("");
  const [stilKartiKaydediliyor, setStilKartiKaydediliyor] = useState(false);
  const [sonStilAnalizi, setSonStilAnalizi] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // GPT-4o analiz sonucu
  type AnalizSonucu = {
    takiTipi: string;
    konu: string;
    mevcutSahne: string;
    stilAciklamasi: string;
    stilPrompt: string;
    oneriler: string[];
  };
  const [analiz, setAnaliz] = useState<AnalizSonucu | null>(null);
  const [analizYukleniyor, setAnalizYukleniyor] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Results
  const [images, setImages] = useState<string[]>([]);
  const [filenames, setFilenames] = useState<string[]>([]);
  const [originals, setOriginals] = useState<string[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modal, setModal] = useState<Modal | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Lightbox + masking
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [maskMode, setMaskMode] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [maskResult, setMaskResult] = useState<string | null>(null);
  const [maskLoading, setMaskLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskImgRef = useRef<HTMLImageElement>(null);
  const isDrawingRef = useRef(false);

  const [kaydediliyor, setKaydediliyor] = useState<number | null>(null);
  const [kaydedildi, setKaydedildi] = useState<Set<number>>(new Set());

  type PromptGecmisi = {
    id: string;
    tarih: string;
    takiTipi: string;
    tema: string;
    metalRengi: string;
    seed?: number;
    gorselUrl: string;
  };
  const [promptGecmisi, setPromptGecmisi] = useState<PromptGecmisi[]>([]);
  const [gecmisAcik, setGecmisAcik] = useState(false);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const isOpBusy = (index: number) =>
    (load.kind === "op" && load.index === index) ||
    (load.kind === "downloading" && load.index === index);

  const toggleForm = (k: FormKarakteri) =>
    setFormKarakterleri((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  // ─── Lightbox ────────────────────────────────────────────────────────────────

  function closeLightbox() {
    setLightbox(null);
    setMaskMode(false);
    setMaskResult(null);
    setMaskLoading(false);
    isDrawingRef.current = false;
  }

  // ESC closes lightbox
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Sync canvas resolution to rendered image size when entering mask mode
  useEffect(() => {
    if (!maskMode || !canvasRef.current || !maskImgRef.current) return;
    const img = maskImgRef.current;
    const sync = () => {
      if (!canvasRef.current || img.offsetWidth === 0) return;
      canvasRef.current.width = img.offsetWidth;
      canvasRef.current.height = img.offsetHeight;
    };
    sync();
    img.addEventListener("load", sync);
    return () => img.removeEventListener("load", sync);
  }, [maskMode]);

  function clearMask() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function applyMask(maskAction: "erase" | "inpaint") {
    if (!canvasRef.current || lightbox === null) return;
    const canvas = canvasRef.current;
    const src = images[lightbox];

    // Scale drawn mask up to original image dimensions
    let naturalW = canvas.width;
    let naturalH = canvas.height;
    try {
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        probe.onload = () => { naturalW = probe.naturalWidth; naturalH = probe.naturalHeight; res(); };
        probe.onerror = rej;
        probe.src = src;
      });
    } catch { /* fall back to canvas dims */ }

    const off = document.createElement("canvas");
    off.width = naturalW;
    off.height = naturalH;
    const offCtx = off.getContext("2d")!;
    offCtx.drawImage(canvas, 0, 0, naturalW, naturalH);
    const raw = offCtx.getImageData(0, 0, naturalW, naturalH);
    const d = raw.data;
    for (let i = 0; i < d.length; i += 4) {
      const isRed = d[i] > 150 && d[i + 1] < 100 && d[i + 2] < 100 && d[i + 3] > 50;
      d[i] = isRed ? 255 : 0;
      d[i + 1] = isRed ? 255 : 0;
      d[i + 2] = isRed ? 255 : 0;
      d[i + 3] = 255;
    }
    offCtx.putImageData(raw, 0, 0);
    const maskBase64 = off.toDataURL("image/png");

    setMaskLoading(true);
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/stability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: maskAction, image: src, mask: maskBase64 }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? ke.errMask); return; }
      setMaskResult(json.image ?? null);
      setMaskMode(false);
    } catch { setError(ke.errConnection); }
    finally { setMaskLoading(false); }
  }

  // ─── Canvas drawing ──────────────────────────────────────────────────────────

  function paintAt(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(220, 40, 40, 0.55)";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function onCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    isDrawingRef.current = true;
    paintAt(e.clientX, e.clientY);
  }
  function onCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (isDrawingRef.current) paintAt(e.clientX, e.clientY);
  }
  function onCanvasMouseUp() { isDrawingRef.current = false; }

  function onCanvasTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    isDrawingRef.current = true;
    const t = e.touches[0];
    paintAt(t.clientX, t.clientY);
  }
  function onCanvasTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (isDrawingRef.current) { const t = e.touches[0]; paintAt(t.clientX, t.clientY); }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setRefBase64(base64);
      setRefName(file.name);
      setAnaliz(null);

      // GPT-4o ile otomatik analiz
      setAnalizYukleniyor(true);
      try {
        const res = await fetch("/api/remaura/koleksiyon-edit/analiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (res.ok) setAnaliz(data);
      } catch { /* analiz sessizce başarısız olabilir */ }
      finally { setAnalizYukleniyor(false); }
    };
    reader.readAsDataURL(file);
  }, []);

  // ─── Generate ───────────────────────────────────────────────────────────────

  // Serif fontta harf şablonu üret (ControlNet için)
  function generateLetterTemplate(letter: string): string {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = "black";
    ctx.font = "bold 720px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter.toUpperCase().charAt(0), 512, 512);
    return canvas.toDataURL("image/png");
  }

  async function handleControlnetUret() {
    if (!harfGirdisi.trim()) { setError(ke.errLetterRequired); return; }
    setError(null);
    setLoad({ kind: "generating" });
    setImages([]);
    setFilenames([]);
    try {
      const letterTemplate = generateLetterTemplate(harfGirdisi);
      const res = await fetch("/api/remaura/koleksiyon-edit/controlnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterTemplate,
          referansGorsel: refBase64,
          takiTipi,
          tema,
          formKarakterleri,
          metalRengi,
          targetLetter: harfGirdisi.trim(),
          referansGucu,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? ke.errGenerating); return; }
      const imgs: string[] = data.images ?? [];
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      setImages(imgs);
      setPromptGecmisi(prev => [{
        id: Date.now().toString(),
        tarih: new Date().toLocaleTimeString("tr-TR"),
        takiTipi,
        tema: tema || "(referanstan)",
        metalRengi,
        seed: data.seed,
        gorselUrl: imgs[0],
      }, ...prev.slice(0, 9)]);
      setOriginals(imgs);
      setFilenames(imgs.map((_, i) => `remaura-cn-${ts}-${i + 1}.png`));
    } catch (e) { setError((e as Error)?.message ?? ke.errConnection); }
    finally { setLoad({ kind: "idle" }); }
  }

  async function handleKoleksiyonUret() {
    if (!analiz) { setError(ke.errAnalyzeFirst); return; }
    if (!refBase64) { setError(ke.errRefRequired); return; }
    setError(null);
    setLoad({ kind: "generating" });
    setImages([]);
    setFilenames([]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 270_000); // 4.5 dakika

    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/gemini-uret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          takiTipi,
          tema,
          metalRengi,
          formKarakterleri,
          referansGorsel: refBase64,
          numImages: varyasyonSayisi,
        }),
        signal: controller.signal,
      });

      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* JSON parse hatası */ }

      if (!res.ok) { setError((data.error as string) ?? ke.errGenerating); return; }
      const imgs: string[] = (data.images as string[]) ?? [];
      if (imgs.length === 0) { setError(ke.errGenerating); return; }

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      setImages(imgs);
      if (data.styleAnalysis) setSonStilAnalizi(data.styleAnalysis as string);
      setOriginals(imgs);
      setFilenames(imgs.map((_, i) => `remaura-${ts}-${i+1}.png`));
      setPromptGecmisi(prev => [{
        id: Date.now().toString(),
        tarih: new Date().toLocaleTimeString("tr-TR"),
        takiTipi,
        tema: tema || "(koleksiyon)",
        metalRengi,
        gorselUrl: imgs[0],
      }, ...prev.slice(0, 9)]);
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") {
        setError("Görsel üretimi çok uzun sürdü. Lütfen daha küçük bir varyasyon sayısı seçip tekrar deneyin.");
      } else {
        setError(ke.errConnection);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoad({ kind: "idle" });
    }
  }

  async function handleUret() {
    if (!tema.trim() && !refBase64) { setError(ke.errThemeOrRef); return; }
    setError(null);
    setLoad({ kind: "generating" });
    setImages([]);
    setFilenames([]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 270_000); // 4.5 dakika

    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/uret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ takiTipi, tema, formKarakterleri, metalRengi, referansGorsel: refBase64, numImages: varyasyonSayisi, referansGucu, stilPrompt: analiz?.stilPrompt }),
        signal: controller.signal,
      });

      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* JSON parse hatası — veri yok */ }

      if (!res.ok) { setError((data.error as string) ?? ke.errGenerating); return; }
      const imgs: string[] = (data.images as string[]) ?? [];
      if (imgs.length === 0) { setError(ke.errGenerating); return; }

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      setImages(imgs);
      setPromptGecmisi(prev => [{
        id: Date.now().toString(),
        tarih: new Date().toLocaleTimeString("tr-TR"),
        takiTipi,
        tema: tema || "(referanstan)",
        metalRengi,
        seed: data.seed as number | undefined,
        gorselUrl: imgs[0],
      }, ...prev.slice(0, 9)]);
      setOriginals(imgs);
      setFilenames(imgs.map((_, i) => `remaura-${ts}-${i + 1}.png`));
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") {
        setError("Görsel üretimi çok uzun sürdü. Lütfen daha küçük bir varyasyon sayısı seçip tekrar deneyin.");
      } else {
        setError(ke.errConnection);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoad({ kind: "idle" });
    }
  }

  // ─── Stability helper ────────────────────────────────────────────────────────

  async function callStability(
    index: number,
    payload: Record<string, unknown>,
    label: string
  ): Promise<string | null> {
    setLoad({ kind: "op", index, label });
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/stability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: images[index], ...payload }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? ke.errGenerating); return null; }
      return data.image ?? null;
    } catch { setError(ke.errConnection); return null; }
    finally { setLoad({ kind: "idle" }); }
  }

  function replaceImg(index: number, src: string) {
    setImages((prev) => { const n = [...prev]; n[index] = src; return n; });
  }

  // ─── Per-image actions ───────────────────────────────────────────────────────

  async function handleRemoveBg(index: number) {
    const result = await callStability(index, { action: "remove-background" }, ke.actionRemoveBg);
    if (result) replaceImg(index, result);
  }

  async function handleUpscale(index: number) {
    const result = await callStability(index, { action: "upscale" }, ke.actionUpscale);
    if (result) replaceImg(index, result);
  }

  async function handleModalSubmit() {
    if (!modal) return;
    setModalLoading(true);
    try {
      let result: string | null = null;
      if (modal.type === "replace") {
        result = await callStability(
          modal.index,
          { action: "search-replace", searchPrompt: modal.searchPrompt, replacePrompt: modal.replacePrompt },
          ke.actionReplace
        );
      } else {
        result = await callStability(
          modal.index,
          { action: "recolor", selectPrompt: modal.selectPrompt, colorPrompt: modal.colorPrompt },
          ke.actionRecolor
        );
      }
      if (result) replaceImg(modal.index, result);
      setModal(null);
    } finally { setModalLoading(false); }
  }

  function handleRevert(index: number) {
    if (!originals[index]) return;
    setImages((prev) => { const n = [...prev]; n[index] = originals[index]; return n; });
  }

  async function handleTasKaldir(index: number) {
    setLoad({ kind: "op", index, label: ke.actionRemoveStone });
    setError(null);
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/tas-kaldir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: images[index] }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { data = { error: `HTTP ${res.status}` }; }
      if (!res.ok) { setError((data.error as string) ?? ke.errGenerating); return; }
      if (data.image) replaceImg(index, data.image as string);
    } catch (e) { setError((e as Error)?.message ?? ke.errConnection); }
    finally { setLoad({ kind: "idle" }); }
  }

  async function handleDownload(index: number) {
    setLoad({ kind: "downloading", index });
    try {
      const src = images[index];

      const filename = filenames[index] ?? `remaura-${index + 1}.png`;

      // showDirectoryPicker kullanıcı tıklamasından hemen sonra çağrılmalı (browser güvenlik kuralı)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let dirHandle: any = null;
      if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dirHandle = await (window as any).showDirectoryPicker();
        } catch (e) {
          if ((e as { name?: string })?.name === "AbortError") return;
        }
      }

      // Klasör seçildikten sonra fetch + canvas + watermark
      const fetchRes = await fetch(src);
      if (!fetchRes.ok) throw new Error(`fetch ${fetchRes.status}`);
      const fetchBlob = await fetchRes.blob();
      const objectUrl = URL.createObjectURL(fetchBlob);

      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = objectUrl;
      });
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const paddingX = Math.round(canvas.width * 0.025);
      const paddingY = Math.round(canvas.height * 0.025);
      const size1 = Math.max(18, Math.round(canvas.width * 0.026));
      const size2 = Math.max(12, Math.round(canvas.width * 0.016));
      const size3 = Math.max(11, Math.round(canvas.width * 0.014));
      const x = canvas.width - paddingX;
      const y3 = canvas.height - paddingY;
      const y2 = y3 - size3 * 1.5;
      const y1 = y2 - size2 * 1.5;

      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(183,110,121,0.25)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      ctx.font = `700 ${size1}px Georgia, serif`;
      ctx.fillStyle = "#b76e79";
      ctx.fillText("Trend Mücevher", x, y1);

      ctx.font = `400 ${size2}px Georgia, serif`;
      ctx.fillStyle = "rgba(183,110,121,0.8)";
      ctx.fillText("by Murat Kaynaroğlu", x, y2);

      ctx.font = `400 ${size3}px sans-serif`;
      ctx.fillStyle = "rgba(183,110,121,0.65)";
      ctx.fillText("trendmucevher.com", x, y3);

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error("toBlob failed")), "image/png")
      );

      if (dirHandle) {
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }

      // Firefox / Safari fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

    } catch { setError(ke.errDownload); }
    finally { setLoad({ kind: "idle" }); }
  }

  async function handleKaydet(index: number) {
    setKaydediliyor(index);
    setError(null);
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/kaydet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gorselUrl: images[index],
          koleksiyonAdi: koleksiyonAdi || undefined,
          tip: takiTipi,
          tema: tema || undefined,
          metal: metalRengi,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? ke.errSave); return; }
      setKaydedildi(prev => new Set([...prev, index]));
    } catch { setError(ke.errConnection); }
    finally { setKaydediliyor(null); }
  }

  async function handleStilKartiKaydet() {
    if (!stilKartiIsim.trim() || !sonStilAnalizi) return;
    setStilKartiKaydediliyor(true);
    try {
      const res = await fetch("/api/remaura/koleksiyon-edit/stil-karti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isim: stilKartiIsim.trim(),
          stil_prompt: sonStilAnalizi,
          metal: metalRengi || null,
          referans_gorsel_url: null,
          ornek_uretim_url: images[0] ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Stil kartı kaydedilemedi."); return; }
      setStilKartiModal(false);
      setStilKartiIsim("");
      setToastMsg("✓ Stil kartı kaydedildi");
      setTimeout(() => setToastMsg(null), 3000);
    } catch { setError("Bağlantı hatası."); }
    finally { setStilKartiKaydediliyor(false); }
  }

  // ─── Drag-drop ───────────────────────────────────────────────────────────────

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) handleFileChange(file);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "white", display: "flex", flexDirection: "column", fontFamily: "var(--font-display, sans-serif)" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        ::placeholder { color: rgba(255,255,255,0.18); }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 28px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4em", color: ACCENT }}>Remaura</span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
        <span style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.35)" }}>{ke.breadcrumb}</span>
      </div>

      {/* Geçmiş paneli */}
      {promptGecmisi.length > 0 && (
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 16px" }}>
          <button
            type="button"
            onClick={() => setGecmisAcik(p => !p)}
            style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", background: "none",
              border: "none", cursor: "pointer", textTransform: "uppercase",
              letterSpacing: "0.2em", display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>{ke.history} ({promptGecmisi.length})</span>
            <span>{gecmisAcik ? "▲" : "▼"}</span>
          </button>
          {gecmisAcik && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 8, paddingBottom: 4 }}>
              {promptGecmisi.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setTakiTipi(g.takiTipi as TakiTipi);
                    setTema(g.tema);
                    setMetalRengi(g.metalRengi as MetalRengi);
                    setGecmisAcik(false);
                  }}
                  style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 4,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8, padding: 6, cursor: "pointer", width: 72 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.gorselUrl} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6 }} />
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>{g.tarih}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* ── Sol Panel ─────────────────────────────────────────────────── */}
        <div style={{ width: 340, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", minHeight: "calc(100vh - 49px)" }}>

          {/* ── PANEL 1: HIZLI ÜRETİM ── */}
          <div style={{ padding: 20, borderBottom: "2px solid rgba(183,110,121,0.15)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, background: ACCENT, borderRadius: 2 }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.35em", textTransform: "uppercase", color: ACCENT }}>{ke.panel1Title}</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>— {ke.panel1Sub}</span>
            </div>

            {/* Referans görsel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>{ke.refLabel} <span style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>{ke.refOptional}</span></Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, cursor: "pointer", overflow: "hidden", minHeight: 80, display: "flex", alignItems: "center", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(183,110,121,0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              >
                {refBase64 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, width: "100%" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={refBase64} alt="ref" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{refName}</p>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setRefBase64(null); setRefName(""); setAnaliz(null); if (fileRef.current) fileRef.current.value = ""; }}
                        style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", marginTop: 4, padding: 0 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                      >{ke.refRemove}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: 6 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.2em" }}>{ke.refDrag}</span>
                  </div>
                )}
              </div>
              {refBase64 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Label>{ke.refStrength}</Label>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>
                      {referansGucu < 0.4 ? ke.refPromptHeavy : referansGucu > 0.7 ? ke.refRefHeavy : ke.refBalanced}
                    </span>
                  </div>
                  <input type="range" min={0.1} max={1.0} step={0.05} value={referansGucu}
                    onChange={(e) => setReferansGucu(Number(e.target.value))}
                    style={{ width: "100%", accentColor: ACCENT }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{ke.refCreative}</span>
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{ke.refExact}</span>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
            </div>

            {/* Koleksiyon adı */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>{ke.collLabel}</Label>
              <FieldInput value={koleksiyonAdi} onChange={(e) => setKoleksiyonAdi(e.target.value)} placeholder={ke.collPlaceholder} />
            </div>

            {/* Takı tipi */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>{ke.jewelryLabel}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TAKI_TIPI.map((tip) => (
                  <ChipBtn key={tip} active={takiTipi === tip} onClick={() => setTakiTipi(tip)}>{takiDisplay[tip]}</ChipBtn>
                ))}
              </div>
            </div>

            {/* Tema */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>{ke.themeLabel}</Label>
              <FieldTextarea rows={4} value={tema} onChange={(e) => setTema(e.target.value)} placeholder={ke.themePlaceholder} />
            </div>

            {/* Form karakteri */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>{ke.formLabel} <span style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>{ke.formMultiple}</span></Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {FORM_KARAKTERLERI.map((k) => (
                  <ChipBtn key={k} active={formKarakterleri.includes(k)} onClick={() => toggleForm(k)}>{formDisplay[k]}</ChipBtn>
                ))}
              </div>
            </div>

            {/* Metal rengi */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>{ke.metalLabel}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {METAL_RENGI.map(({ label, hex }) => (
                  <button key={label} type="button" onClick={() => setMetalRengi(label)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", border: "1px solid", cursor: "pointer", transition: "all 0.15s", background: metalRengi === label ? "rgba(183,110,121,0.16)" : "rgba(255,255,255,0.03)", borderColor: metalRengi === label ? ACCENT : "rgba(255,255,255,0.08)", color: metalRengi === label ? ACCENT_LIGHT : "rgba(255,255,255,0.4)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: hex, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    {metalDisplay[label]}
                  </button>
                ))}
              </div>
            </div>

            {/* Varyasyon sayısı */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>{ke.variationLabel}</Label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4].map(n => (
                  <ChipBtn key={n} active={varyasyonSayisi === n} onClick={() => setVaryasyonSayisi(n)}>{n}</ChipBtn>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ fontSize: 11, color: "rgba(248,113,113,0.85)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                {error}
              </div>
            )}

            {/* GÖRSEL ÜRET butonu */}
            <button type="button" onClick={handleUret} disabled={load.kind === "generating"}
              style={{ width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", border: `1px solid ${ACCENT}`, cursor: load.kind === "generating" ? "not-allowed" : "pointer", opacity: load.kind === "generating" ? 0.6 : 1, transition: "all 0.15s", background: "rgba(183,110,121,0.14)", color: ACCENT_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {load.kind === "generating" && <Spinner />}
              {load.kind === "generating" ? ke.generating : ke.generateBtn}
            </button>
          </div>

          {/* ── PANEL 2: KOLEKSİYON MODU ── */}
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, background: "rgba(100,160,255,0.7)", borderRadius: 2 }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(100,160,255,0.8)" }}>{ke.panel2Title}</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>— {ke.panel2Sub}</span>
            </div>

            {/* Analiz sonucu */}
            {analiz && !analizYukleniyor && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: ACCENT }}>{analiz.takiTipi}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{analiz.konu}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{analiz.mevcutSahne}</span>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(255,255,255,0.25)" }}>{ke.suggestionsLabel}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {analiz.oneriler.map((oneri, idx) => (
                      <button key={idx} type="button" onClick={() => setTema(oneri)}
                        style={{ textAlign: "left", padding: "6px 10px", borderRadius: 7, fontSize: 10, color: "rgba(255,255,255,0.55)", background: tema === oneri ? "rgba(183,110,121,0.12)" : "rgba(255,255,255,0.02)", border: `1px solid ${tema === oneri ? "rgba(183,110,121,0.35)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", transition: "all 0.12s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(183,110,121,0.3)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = tema === oneri ? "rgba(183,110,121,0.35)" : "rgba(255,255,255,0.06)"; e.currentTarget.style.color = tema === oneri ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.55)"; }}
                      >{oneri}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Analiz yükleniyor */}
            {analizYukleniyor && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                <Spinner size={12} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.2em" }}>{ke.analyzingStyle}</span>
              </div>
            )}

            {/* Referans bekleniyor */}
            {!analiz && !analizYukleniyor && (
              <div style={{ padding: "12px", background: "rgba(100,160,255,0.04)", border: "1px dashed rgba(100,160,255,0.15)", borderRadius: 8 }}>
                <p style={{ fontSize: 10, color: "rgba(100,160,255,0.4)", textAlign: "center", letterSpacing: "0.1em" }}>
                  {ke.refUploadHint}
                </p>
              </div>
            )}

            {/* Hedef harf — ControlNet */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>{ke.letterLabel} <span style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>{ke.letterSub}</span></Label>
              <FieldInput value={harfGirdisi}
                onChange={(e) => setHarfGirdisi(e.target.value.toUpperCase().charAt(0) || "")}
                placeholder={ke.letterPlaceholder} maxLength={1}
                style={{ textAlign: "center", fontSize: 20, fontWeight: 700, letterSpacing: "0.2em" }} />
            </div>

            {/* KOLEKSİYON ÜRET butonu */}
            <button type="button"
              onClick={handleKoleksiyonUret}
              disabled={load.kind === "generating" || !analiz}
              style={{ width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", border: "1px solid rgba(100,160,255,0.4)", cursor: (load.kind === "generating" || !analiz) ? "not-allowed" : "pointer", opacity: (load.kind === "generating" || !analiz) ? 0.4 : 1, transition: "all 0.15s", background: "rgba(100,160,255,0.08)", color: "rgba(140,190,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {load.kind === "generating" && <Spinner />}
              {load.kind === "generating" ? ke.generating
                : !analiz ? ke.uploadFirst
                : harfGirdisi ? `${ke.collectionBtn} · ${harfGirdisi}`
                : ke.collectionBtn}
            </button>

            {/* Stili Kaydet — sadece üretim sonrası görünür */}
            {sonStilAnalizi && (
              <button
                type="button"
                onClick={() => setStilKartiModal(true)}
                style={{
                  width: "100%", marginTop: 8, padding: "9px 0",
                  borderRadius: 8, fontSize: 9, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.25em",
                  border: "1px solid rgba(100,160,255,0.3)",
                  background: "rgba(100,160,255,0.06)",
                  color: "rgba(100,160,255,0.7)", cursor: "pointer",
                }}
              >
                ✦ Stili Kaydet
              </button>
            )}
          </div>

        </div>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: "calc(100vh - 49px)" }}>

          {load.kind === "generating" && <GridSkeleton />}

          {load.kind !== "generating" && images.length === 0 && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.35em", color: "rgba(255,255,255,0.08)", textAlign: "center", lineHeight: 2 }}>
                  {ke.emptyHint}
                </p>
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div style={{ maxWidth: 480 }}>
              {images.map((src, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                  {/* Image */}
                  <div style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "#000" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Konsept ${i + 1}`}
                      onClick={() => { setLightbox(i); setMaskMode(false); setMaskResult(null); }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                    />

                    {/* Op loading overlay */}
                    {isOpBusy(i) && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                        <Spinner size={24} />
                        <span style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(255,255,255,0.4)" }}>
                          {load.kind === "op" ? load.label : ke.saving}
                        </span>
                      </div>
                    )}

                    {/* Badges */}
                    <div style={{ position: "absolute", top: 8, left: 8, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.4)" }}>
                      {i + 1} / {images.length}
                    </div>
                    {load.kind === "downloading" && load.index === i && (
                      <div style={{ position: "absolute", top: 8, right: 8, fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(183,110,121,0.85)", color: "white", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {ke.downloading}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    <ActionBtn onClick={() => handleRemoveBg(i)} disabled={isOpBusy(i)}>{ke.actionRemoveBg}</ActionBtn>
                    <ActionBtn onClick={() => handleUpscale(i)} disabled={isOpBusy(i)}>{ke.actionUpscale}</ActionBtn>
                    <ActionBtn
                      onClick={() => setModal({ type: "recolor", index: i, selectPrompt: "", colorPrompt: "" })}
                      disabled={isOpBusy(i)}
                    >
                      {ke.actionRecolor}
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => setModal({ type: "replace", index: i, searchPrompt: "", replacePrompt: "" })}
                      disabled={isOpBusy(i)}
                    >
                      {ke.actionReplace}
                    </ActionBtn>
                    <ActionBtn onClick={() => handleTasKaldir(i)} disabled={isOpBusy(i)}>
                      {ke.actionRemoveStone}
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => { setLightbox(i); setMaskMode(true); setMaskResult(null); }}
                      disabled={isOpBusy(i)}
                    >
                      {ke.actionMask}
                    </ActionBtn>
                    {originals[i] && images[i] !== originals[i] && (
                      <ActionBtn onClick={() => handleRevert(i)} disabled={isOpBusy(i)}>
                        {ke.actionRevert}
                      </ActionBtn>
                    )}
                    <ActionBtn
                      onClick={() => handleKaydet(i)}
                      disabled={isOpBusy(i) || kaydediliyor === i}
                      accent
                    >
                      {kaydediliyor === i ? ke.actionSaving : kaydedildi.has(i) ? ke.actionSaved : ke.actionSave}
                    </ActionBtn>
                    <ActionBtn onClick={() => handleDownload(i)} disabled={isOpBusy(i)} accent>
                      {ke.actionDownload}
                    </ActionBtn>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightbox !== null && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.93)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.55)", fontSize: 14, padding: "6px 12px", cursor: "pointer", lineHeight: 1 }}
          >
            ✕
          </button>

          {/* Image area */}
          {maskResult ? (
            <div style={{ display: "flex", gap: 20, maxWidth: "90vw" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)" }}>{ke.original}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[lightbox]} alt={ke.original} style={{ maxWidth: "42vw", maxHeight: "68vh", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", display: "block" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)" }}>{ke.result}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={maskResult} alt={ke.result} style={{ maxWidth: "42vw", maxHeight: "68vh", borderRadius: 10, border: "1px solid rgba(183,110,121,0.3)", display: "block" }} />
              </div>
            </div>
          ) : (
            <div style={{ position: "relative", display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={maskImgRef}
                src={images[lightbox]}
                alt={`Konsept ${lightbox + 1}`}
                style={{ display: "block", maxWidth: "85vw", maxHeight: "75vh", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", userSelect: "none" }}
              />
              {maskMode && (
                <canvas
                  ref={canvasRef}
                  style={{ position: "absolute", top: 0, left: 0, borderRadius: 10, cursor: "crosshair", touchAction: "none", width: "100%", height: "100%" }}
                  onMouseDown={onCanvasMouseDown}
                  onMouseMove={onCanvasMouseMove}
                  onMouseUp={onCanvasMouseUp}
                  onMouseLeave={onCanvasMouseUp}
                  onTouchStart={onCanvasTouchStart}
                  onTouchMove={onCanvasTouchMove}
                  onTouchEnd={() => { isDrawingRef.current = false; }}
                />
              )}
            </div>
          )}

          {/* Bottom controls */}
          <div style={{ marginTop: 18, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            {maskResult ? (
              <>
                <ActionBtn accent onClick={async () => {
                  try {
                    const blob = await (await fetch(maskResult)).blob();
                    const slug = (koleksiyonAdi.trim() || "koleksiyon").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "koleksiyon";
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = `${slug}_mask.png`; a.click();
                    URL.revokeObjectURL(url);
                  } catch { setError(ke.errDownload); }
                }}>
                  {ke.actionDownload}
                </ActionBtn>
                <ActionBtn onClick={() => { replaceImg(lightbox, maskResult); closeLightbox(); }}>
                  {ke.updateImage}
                </ActionBtn>
                <ActionBtn onClick={() => setMaskResult(null)}>{ke.back}</ActionBtn>
              </>
            ) : maskMode ? (
              <>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.2em" }}>{ke.brush}</span>
                <input
                  type="range" min={10} max={80} value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  style={{ width: 90, accentColor: ACCENT }}
                />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", minWidth: 22, textAlign: "center" }}>{brushSize}</span>
                <ActionBtn onClick={clearMask}>{ke.clear}</ActionBtn>
                <ActionBtn onClick={() => applyMask("erase")} disabled={maskLoading}>
                  {maskLoading ? "…" : ke.erase}
                </ActionBtn>
                <ActionBtn onClick={() => applyMask("inpaint")} disabled={maskLoading}>
                  {maskLoading ? "…" : ke.fill}
                </ActionBtn>
                <ActionBtn onClick={() => setMaskMode(false)}>{ke.cancel}</ActionBtn>
              </>
            ) : (
              <>
                <ActionBtn onClick={() => setMaskMode(true)}>{ke.maskAndErase}</ActionBtn>
                <ActionBtn accent onClick={() => handleDownload(lightbox)}>{ke.actionDownload}</ActionBtn>
              </>
            )}
          </div>

          {/* Mask processing overlay */}
          {maskLoading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <Spinner size={32} />
              <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)" }}>{ke.processing}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          zIndex: 100, padding: "10px 20px", borderRadius: 10,
          background: "rgba(100,160,255,0.15)", border: "1px solid rgba(100,160,255,0.35)",
          color: "rgba(140,190,255,0.9)", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.15em", textTransform: "uppercase", pointerEvents: "none",
        }}>
          {toastMsg}
        </div>
      )}

      {/* ── Stil Kartı Modal ──────────────────────────────────────────────── */}
      {stilKartiModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }} onClick={() => !stilKartiKaydediliyor && setStilKartiModal(false)}>
          <div style={{
            width: 320, borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#111", padding: 20,
            display: "flex", flexDirection: "column", gap: 14,
          }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.3em", color: "rgba(100,160,255,0.8)" }}>
              ✦ Stil Kartı Kaydet
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
              Bu stili kaydedersen, ileride aynı koleksiyona yeni parçalar eklemek için tekrar kullanabilirsin.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Label>Koleksiyon Adı</Label>
              <FieldInput
                value={stilKartiIsim}
                onChange={e => setStilKartiIsim(e.target.value)}
                placeholder="Örn: Orchidaceae Koleksiyonu"
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button"
                onClick={() => setStilKartiModal(false)}
                disabled={stilKartiKaydediliyor}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 9,
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)", background: "none", cursor: "pointer",
                  opacity: stilKartiKaydediliyor ? 0.4 : 1 }}>
                İptal
              </button>
              <button type="button"
                onClick={handleStilKartiKaydet}
                disabled={stilKartiKaydediliyor || !stilKartiIsim.trim()}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 9,
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em",
                  border: "1px solid rgba(100,160,255,0.4)",
                  background: "rgba(100,160,255,0.1)",
                  color: "rgba(100,160,255,0.8)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: (stilKartiKaydediliyor || !stilKartiIsim.trim()) ? 0.4 : 1 }}>
                {stilKartiKaydediliyor && <Spinner size={12} />}
                {stilKartiKaydediliyor ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => !modalLoading && setModal(null)}
        >
          <div
            style={{ width: 320, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", background: "#111", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: ACCENT_LIGHT }}>
              {modal.type === "replace" ? ke.searchReplaceTitle : ke.recolorTitle}
            </p>

            {/* Replace inputs */}
            {modal.type === "replace" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <Label>{ke.searchLabel}</Label>
                  <FieldInput
                    value={modal.searchPrompt}
                    onChange={(e) => setModal({ ...modal, searchPrompt: e.target.value })}
                    placeholder={ke.searchPlaceholder}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <Label>{ke.replaceLabel}</Label>
                  <FieldInput
                    value={modal.replacePrompt}
                    onChange={(e) => setModal({ ...modal, replacePrompt: e.target.value })}
                    placeholder={ke.replacePlaceholder}
                  />
                </div>
              </div>
            )}

            {/* Recolor inputs */}
            {modal.type === "recolor" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <Label>{ke.recolorSelectLabel}</Label>
                  <FieldInput
                    value={modal.selectPrompt}
                    onChange={(e) => setModal({ ...modal, selectPrompt: e.target.value })}
                    placeholder={ke.recolorSelectPlaceholder}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <Label>{ke.recolorColorLabel}</Label>
                  <FieldInput
                    value={modal.colorPrompt}
                    onChange={(e) => setModal({ ...modal, colorPrompt: e.target.value })}
                    placeholder={ke.recolorColorPlaceholder}
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={modalLoading}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", background: "none", cursor: "pointer", opacity: modalLoading ? 0.4 : 1 }}
              >
                {ke.cancel}
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={modalLoading}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", border: `1px solid ${ACCENT}`, background: "rgba(183,110,121,0.18)", color: ACCENT_LIGHT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: modalLoading ? 0.7 : 1 }}
              >
                {modalLoading && <Spinner size={12} />}
                {modalLoading ? ke.processing : ke.applyBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
