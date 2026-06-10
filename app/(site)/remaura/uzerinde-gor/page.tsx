"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  RemauraBillingModalProvider,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { useRemauraCreditsCheck } from "@/hooks/useRemauraCreditsCheck";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FingerLandmark {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
}

interface FingerData {
  mcp: FingerLandmark; // ring finger base (boğum)
  pip: FingerLandmark; // ring finger middle
  widthRatio: number;  // parmak genişliği / görüntü genişliği
}

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  tr: {
    title: "Üzerimde Gör",
    subtitle: "Yüzüğü parmağında nasıl görüneceğini keşfet ve sosyal medyada paylaş.",
    step1: "1. El Fotoğrafı",
    step1Hint: "Parmakların düz ve ayrık, avuç içi yukarı bakacak şekilde fotoğrafla.",
    step2: "2. Yüzük Görseli",
    step2Hint: "Denemek istediğiniz yüzüğün görseli.",
    ringAutoLoaded: "✓ Yüzük otomatik yüklendi",
    uploadHand: "El fotoğrafı yükle",
    uploadRing: "Yüzük görseli yükle",
    changePhoto: "Fotoğrafı değiştir",
    detectingHand: "El algılanıyor…",
    handDetected: "✓ El algılandı",
    handNotDetected: "⚠ El algılanamadı — yine de deneyebilirsiniz",
    tryBtn: "Dene  (2 kredi)",
    processing: "İşleniyor…",
    resultTitle: "Sonuç",
    shareNative: "Paylaş",
    shareWhatsapp: "WhatsApp",
    shareDownload: "İndir",
    tryAgain: "Tekrar Dene",
    errBothRequired: "Her iki görseli de yüklemeniz gerekiyor.",
    errRingUrlFetch: "Yüzük görseli yüklenemedi, lütfen manuel olarak yükleyin.",
    guideTitle: "El fotoğrafı nasıl çekilmeli?",
    guideItems: [
      { icon: "✅", text: "Avuç içi yukarı, parmaklar düz ve hafif ayrık" },
      { icon: "✅", text: "Kamera tam yukarıdan, dik açıyla baksın" },
      { icon: "✅", text: "İyi aydınlatma — pencere ışığı idealdir" },
      { icon: "✅", text: "Düz, açık renkli arka plan" },
      { icon: "❌", text: "Yanda veya eğik tutmayın" },
      { icon: "❌", text: "Gölgeli veya karanlık ortam" },
    ],
    noteText: "AI, yüzüğün arka planını kaldırıp parmağınıza yerleştiriyor. Her güncellemede kalite artıyor.",
  },
  en: {
    title: "See On Me",
    subtitle: "See how the ring looks on your finger and share it on social media.",
    step1: "1. Hand Photo",
    step1Hint: "Fingers flat and spread, palm facing up.",
    step2: "2. Ring Image",
    step2Hint: "A photo or product image of the ring to try.",
    ringAutoLoaded: "✓ Ring image auto-loaded",
    uploadHand: "Upload hand photo",
    uploadRing: "Upload ring image",
    changePhoto: "Change photo",
    detectingHand: "Detecting hand…",
    handDetected: "✓ Hand detected",
    handNotDetected: "⚠ Hand not detected — you can still try",
    tryBtn: "Try On  (2 credits)",
    processing: "Processing…",
    resultTitle: "Result",
    shareNative: "Share",
    shareWhatsapp: "WhatsApp",
    shareDownload: "Download",
    tryAgain: "Try Again",
    errBothRequired: "Please upload both images.",
    errRingUrlFetch: "Could not load ring image, please upload manually.",
    guideTitle: "How to take the hand photo?",
    guideItems: [
      { icon: "✅", text: "Palm facing up, fingers flat and slightly spread" },
      { icon: "✅", text: "Camera directly above, perpendicular angle" },
      { icon: "✅", text: "Good lighting — window light is ideal" },
      { icon: "✅", text: "Plain, light-colored background" },
      { icon: "❌", text: "Don't hold it sideways or at an angle" },
      { icon: "❌", text: "Avoid shadows or dark environments" },
    ],
    noteText: "AI removes the ring background and places it on your finger. Quality improves with every update.",
  },
};

type Lang = "tr" | "en";

// ─── MediaPipe hand detection ─────────────────────────────────────────────────
async function detectFingerLandmarks(imageFile: File): Promise<FingerData | null> {
  try {
    const { HandLandmarker, FilesetResolver } =
      await import("@mediapipe/tasks-vision");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm",
    );

    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      numHands: 1,
    });

    // File → HTMLImageElement
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = url;
    });

    const result = handLandmarker.detect(img);
    URL.revokeObjectURL(url);
    handLandmarker.close();

    if (!result.landmarks || result.landmarks.length === 0) return null;

    const lm = result.landmarks[0];
    // MediaPipe hand landmarks:
    // 13 = RING_FINGER_MCP (boğum, yüzük takılan yer)
    // 14 = RING_FINGER_PIP (orta boğum)
    // Landmark indeksleri:
    // 13 = RING_FINGER_MCP, 14 = RING_FINGER_PIP
    //  9 = MIDDLE_FINGER_MCP, 17 = PINKY_MCP
    const mcp       = lm[13];
    const pip       = lm[14];
    const middleMcp = lm[9];
    const pinkyMcp  = lm[17];

    if (!mcp || !pip || !middleMcp || !pinkyMcp) return null;

    // Gerçek parmak genişliği ölçümü:
    // Orta parmak MCP (9) ile serçe MCP (17) arası = 2 parmak aralığı
    // 1 parmak ≈ bu mesafenin yarısı → fingerSpacing * 0.5
    // Yüzük genişliği ≈ 1.2 parmak → fingerSpacing * 0.6
    // Görsel olarak daha iyi duran nihai çarpan: 1.3 (önceki değerler çok küçük geldi)
    // Bu oran kamera mesafesinden bağımsız — her el için otomatik doğru ölçek
    const fingerSpacing = Math.sqrt(
      Math.pow(middleMcp.x - pinkyMcp.x, 2) +
      Math.pow(middleMcp.y - pinkyMcp.y, 2),
    );
    const widthRatio = fingerSpacing * 1.3;

    return {
      mcp: { x: mcp.x, y: mcp.y },
      pip: { x: pip.x, y: pip.y },
      widthRatio,
    };
  } catch (e) {
    console.warn("[mediapipe] detection failed:", e);
    return null;
  }
}

// ─── Hand Guide SVG ───────────────────────────────────────────────────────────
function HandGuideSVG() {
  return (
    <div className="flex gap-6 items-start justify-center flex-wrap">
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-36 h-44 rounded-xl overflow-hidden border-2 border-emerald-500/40 bg-[#111]">
          <svg viewBox="0 0 144 176" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="144" height="176" fill="#1a1a1a"/>
            <rect x="44" y="80" width="56" height="52" rx="8" fill="#c8956c"/>
            <ellipse cx="38" cy="104" rx="10" ry="18" fill="#c8956c"/>
            <rect x="48" y="36" width="14" height="52" rx="7" fill="#c8956c"/>
            <rect x="65" y="28" width="14" height="60" rx="7" fill="#c8956c"/>
            <rect x="82" y="34" width="14" height="54" rx="7" fill="#c8956c"/>
            <rect x="80" y="64" width="18" height="8" rx="4" fill="#f5c842" opacity="0.95"/>
            <rect x="82" y="62" width="14" height="4" rx="2" fill="#f5d060"/>
            <rect x="99" y="46" width="12" height="42" rx="6" fill="#c8956c"/>
            <circle cx="122" cy="18" r="10" fill="#22c55e" opacity="0.85"/>
            <path d="M118 18 L122 14 L126 18 L122 22 Z" fill="white"/>
          </svg>
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">✓ Doğru</div>
        </div>
        <p className="text-xs text-emerald-400 text-center max-w-[140px]">Düz, avuç yukarı,<br/>kamera tepeden</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-36 h-44 rounded-xl overflow-hidden border-2 border-red-500/40 bg-[#111]">
          <svg viewBox="0 0 144 176" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="144" height="176" fill="#1a1a1a"/>
            <g transform="rotate(-35, 72, 88)">
              <rect x="44" y="80" width="56" height="52" rx="8" fill="#9a6a45"/>
              <ellipse cx="38" cy="104" rx="10" ry="18" fill="#9a6a45"/>
              <rect x="48" y="36" width="14" height="52" rx="7" fill="#9a6a45"/>
              <rect x="65" y="28" width="14" height="60" rx="7" fill="#9a6a45"/>
              <rect x="82" y="34" width="14" height="54" rx="7" fill="#9a6a45"/>
              <rect x="99" y="46" width="12" height="42" rx="6" fill="#9a6a45"/>
            </g>
            <rect width="144" height="176" fill="rgba(0,0,0,0.35)"/>
            <circle cx="122" cy="18" r="10" fill="#ef4444" opacity="0.85"/>
            <path d="M119 15 L125 21 M125 15 L119 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">✗ Yanlış</div>
        </div>
        <p className="text-xs text-red-400 text-center max-w-[140px]">Eğik veya yandan,<br/>gölgeli ortam</p>
      </div>
    </div>
  );
}

// ─── Upload Box ───────────────────────────────────────────────────────────────
function UploadBox({ label, hint, preview, onFile, changeLabel, badge, status }: {
  label: string; hint: string; preview: string | null;
  onFile: (file: File) => void; changeLabel: string;
  badge?: string; status?: { type: "loading" | "ok" | "warn"; text: string };
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400">{hint}</p>
      {preview ? (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="h-48 w-full rounded-xl object-cover border border-white/10" />
          {badge && <span className="absolute top-2 left-2 rounded-full bg-emerald-600/80 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">{badge}</span>}
          <button type="button" onClick={() => ref.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition text-sm font-semibold text-white">
            {changeLabel}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="h-48 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-3 hover:border-gray-500 transition cursor-pointer">
          <span className="text-3xl">📷</span>
          <span className="text-sm text-gray-400">{label}</span>
        </button>
      )}
      {status && (
        <p className={`text-xs flex items-center gap-1.5 ${
          status.type === "ok" ? "text-emerald-400" :
          status.type === "warn" ? "text-yellow-400" : "text-gray-400"
        }`}>
          {status.type === "loading" && <span className="inline-block h-3 w-3 rounded-full border border-current border-t-transparent animate-spin" />}
          {status.text}
        </p>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ─── Share Buttons ────────────────────────────────────────────────────────────
function ShareButtons({ resultBlob, resultUrl, t }: {
  resultBlob: Blob | null; resultUrl: string; t: typeof T["tr"];
}) {
  const hasNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  const handleNativeShare = async () => {
    if (!resultBlob) return;
    try {
      const file = new File([resultBlob], "uzerimde-gor.png", { type: "image/png" });
      await navigator.share({ title: "Yüzüğü parmağımda denedim — Remaura", text: "Bu yüzüğü parmağımda nasıl görüneceğini gördüm! 💍", files: [file] });
    } catch { /* iptal */ }
  };
  const handleWhatsApp = () => {
    const a = document.createElement("a"); a.href = resultUrl; a.download = "uzerimde-gor.png"; a.click();
    setTimeout(() => window.open("https://wa.me/?text=" + encodeURIComponent("Bu yüzüğü parmağımda denedim! 💍 trendmucevher.com"), "_blank"), 800);
  };
  const handleDownload = () => { const a = document.createElement("a"); a.href = resultUrl; a.download = "uzerimde-gor.png"; a.click(); };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {hasNativeShare && (
        <button type="button" onClick={() => void handleNativeShare()}
          className="flex-1 min-w-[110px] rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 py-3 font-semibold transition hover:opacity-90 flex items-center justify-center gap-2 text-sm">
          🔗 {t.shareNative}
        </button>
      )}
      <button type="button" onClick={handleWhatsApp}
        className="flex-1 min-w-[110px] rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] py-3 font-semibold transition hover:bg-[#25D366]/30 flex items-center justify-center gap-2 text-sm">
        📱 {t.shareWhatsapp}
      </button>
      <button type="button" onClick={handleDownload}
        className="flex-1 min-w-[110px] rounded-xl border border-gray-700 py-3 font-semibold text-gray-300 transition hover:border-gray-500 flex items-center justify-center gap-2 text-sm">
        ⬇ {t.shareDownload}
      </button>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function UzerimdeGorContent() {
  const searchParams = useSearchParams();
  const billingUi = useRemauraBillingModal();
  const { checkCredits } = useRemauraCreditsCheck();

  const [lang, setLang] = useState<Lang>("tr");
  const t = T[lang];

  const [handFile, setHandFile] = useState<File | null>(null);
  const [handPreview, setHandPreview] = useState<string | null>(null);
  const [fingerData, setFingerData] = useState<FingerData | null>(null);
  const [handStatus, setHandStatus] = useState<{ type: "loading" | "ok" | "warn"; text: string } | undefined>();

  const [ringFile, setRingFile] = useState<File | null>(null);
  const [ringPreview, setRingPreview] = useState<string | null>(null);
  const [ringAutoLoaded, setRingAutoLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ?ring=URL → yüzük görselini otomatik yükle
  useEffect(() => {
    const ringUrl = searchParams.get("ring");
    if (!ringUrl) return;
    void (async () => {
      try {
        const res = await fetch(`/api/fetch-media?url=${encodeURIComponent(ringUrl)}`);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const file = new File([blob], "ring.png", { type: blob.type || "image/png" });
        setRingFile(file); setRingPreview(URL.createObjectURL(blob)); setRingAutoLoaded(true);
      } catch { setError(t.errRingUrlFetch); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleHandFile = useCallback((file: File) => {
    if (handPreview) URL.revokeObjectURL(handPreview);
    setHandFile(file); setHandPreview(URL.createObjectURL(file));
    setFingerData(null); setResultUrl(null); setResultBlob(null); setError(null);

    // MediaPipe ile parmak tespiti
    setHandStatus({ type: "loading", text: T[lang].detectingHand });
    void detectFingerLandmarks(file).then((fd) => {
      if (fd) {
        setFingerData(fd);
        setHandStatus({ type: "ok", text: T[lang].handDetected });
      } else {
        setHandStatus({ type: "warn", text: T[lang].handNotDetected });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handPreview, lang]);

  const handleRingFile = useCallback((file: File) => {
    if (ringPreview && !ringAutoLoaded) URL.revokeObjectURL(ringPreview);
    setRingFile(file); setRingPreview(URL.createObjectURL(file));
    setRingAutoLoaded(false); setResultUrl(null); setResultBlob(null); setError(null);
  }, [ringPreview, ringAutoLoaded]);

  const handleTryOn = async () => {
    if (!handFile || !ringFile) { setError(t.errBothRequired); return; }
    const ok = await checkCredits(2, billingUi.openUnauthorized, billingUi.openInsufficientCredits);
    if (!ok) return;

    setLoading(true); setError(null); setResultUrl(null); setResultBlob(null);
    try {
      const { data: { user } } = await createClient().auth.getUser();
      const fd = new FormData();
      fd.append("handImage", handFile);
      fd.append("ringImage", ringFile);
      fd.append("userId", user?.id ?? "");

      // Parmak koordinatlarını gönder (varsa)
      if (fingerData) {
        fd.append("fingerData", JSON.stringify(fingerData));
      }

      const res = await fetch("/api/remaura/try-on", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (res.status === 401 && data?.code === "UNAUTHORIZED") { billingUi.openUnauthorized(); return; }
        if (res.status === 402 && data?.code === "INSUFFICIENT_CREDITS") { billingUi.openInsufficientCredits(); return; }
        throw new Error(data.error ?? "İşlem başarısız.");
      }
      const blob = await res.blob();
      setResultBlob(blob); setResultUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bağlantı hatası.");
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">

        {/* Başlık */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">💍 {t.title}</h1>
            <p className="mt-2 text-gray-400 text-sm">{t.subtitle}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {(["tr", "en"] as Lang[]).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition ${lang === l ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40" : "text-gray-500 hover:text-gray-300"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* El Rehberi */}
        <div className="mb-8 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <p className="mb-4 text-sm font-semibold text-gray-200">📸 {t.guideTitle}</p>
          <HandGuideSVG />
          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {t.guideItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                <span className="shrink-0">{item.icon}</span><span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Upload */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-amber-300">{t.step1}</p>
            <UploadBox label={t.uploadHand} hint={t.step1Hint} preview={handPreview}
              onFile={handleHandFile} changeLabel={t.changePhoto} status={handStatus} />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-amber-300">{t.step2}</p>
            <UploadBox label={t.uploadRing} hint={t.step2Hint} preview={ringPreview}
              onFile={handleRingFile} changeLabel={t.changePhoto}
              badge={ringAutoLoaded ? t.ringAutoLoaded : undefined} />
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">{error}</p>}

        {!resultUrl && (
          <button type="button" onClick={() => void handleTryOn()}
            disabled={loading || !handFile || !ringFile || handStatus?.type === "loading"}
            className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 py-3.5 font-semibold transition hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            {loading && <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {loading ? t.processing : t.tryBtn}
          </button>
        )}

        {resultUrl && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-amber-300">💍 {t.resultTitle}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt={t.resultTitle} className="w-full rounded-2xl border border-white/10 object-contain max-h-[500px]" />
            <ShareButtons resultBlob={resultBlob} resultUrl={resultUrl} t={t} />
            <button type="button" onClick={() => { setResultUrl(null); setResultBlob(null); setError(null); }}
              className="mt-3 w-full rounded-xl border border-gray-700 py-3 text-sm font-semibold text-gray-400 transition hover:border-gray-500">
              {t.tryAgain}
            </button>
          </div>
        )}

        <p className="mt-8 text-xs text-gray-700 text-center">{t.noteText}</p>
      </div>
    </main>
  );
}

export default function UzerimdeGorPage() {
  return (
    <RemauraAccessGate categoryId="uzerinde-gor">
      <RemauraBillingModalProvider>
        <Suspense>
          <UzerimdeGorContent />
        </Suspense>
      </RemauraBillingModalProvider>
    </RemauraAccessGate>
  );
}
