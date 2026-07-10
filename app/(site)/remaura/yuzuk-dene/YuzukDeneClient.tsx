"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// MediaPipe tasks-vision CDN (izole PoC — npm bağımlılığı eklemeden test)
const VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

type Status = "idle" | "loading" | "ready" | "running" | "error";

// Yüzük parmağı landmark indeksleri: 13=MCP(taban) 14=PIP 15=DIP 16=uç
const RING_MCP = 13;
const RING_PIP = 14;

export function YuzukDeneClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState<string>("Başlamak için kameraya izin ver.");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [handsDetected, setHandsDetected] = useState(0);
  const [fps, setFps] = useState(0);
  // window.isSecureContext yalnızca client'ta bilinir — hydration uyuşmazlığını
  // önlemek için mount sonrası oku (sunucu "?", client gerçek değer).
  const [secure, setSecure] = useState<boolean | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("ready");
  }, []);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker) return;

    let last = performance.now();
    let frames = 0;
    let lastFpsT = last;

    const tick = () => {
      if (!videoRef.current || !landmarkerRef.current) return;
      const now = performance.now();
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let result: any;
        try {
          result = landmarker.detectForVideo(video, now);
        } catch {
          /* frame atla */
        }

        const hands = result?.landmarks ?? [];
        setHandsDetected(hands.length);

        for (const lm of hands) {
          drawLandmarks(ctx, lm, canvas.width, canvas.height);
          drawRing(ctx, lm, canvas.width, canvas.height);
        }

        frames++;
        if (now - lastFpsT > 500) {
          setFps(Math.round((frames * 1000) / (now - lastFpsT)));
          frames = 0;
          lastFpsT = now;
        }
        last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    setStatus("loading");
    try {
      // Güvenli bağlam kontrolü (telefonda HTTPS şart)
      if (!window.isSecureContext) {
        setStatus("error");
        setMsg(
          "Kamera yalnızca HTTPS (güvenli bağlantı) üzerinde açılır. Telefonda https:// adresi kullan."
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setMsg("Bu tarayıcı kamerayı desteklemiyor.");
        return;
      }

      setMsg("El takip motoru yükleniyor…");
      if (!landmarkerRef.current) {
        const vision: any = await import(
          /* webpackIgnore: true */ `${VISION_URL}/vision_bundle.mjs`
        );
        const fileset = await vision.FilesetResolver.forVisionTasks(
          `${VISION_URL}/wasm`
        );
        landmarkerRef.current = await vision.HandLandmarker.createFromOptions(
          fileset,
          {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
            numHands: 1,
            runningMode: "VIDEO",
          }
        );
      }

      setMsg("Kamera açılıyor…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      setStatus("running");
      setMsg("Elini kameraya göster — yüzük parmağına halka oturacak.");
      loop();
    } catch (e: any) {
      setStatus("error");
      setMsg(
        "Başlatılamadı: " +
          (e?.name === "NotAllowedError"
            ? "kamera izni reddedildi."
            : e?.message || String(e))
      );
    }
  }, [facing, loop]);

  useEffect(() => {
    setSecure(window.isSecureContext);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#07080a] text-white/90">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="font-display text-2xl font-medium tracking-[-0.03em]">
          Yüzük Dene
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Canlı kamera denemesi — parmağını takip edip yüzük halkasını oturtur.
        </p>

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="block h-auto w-full"
            style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
          />
          {status !== "running" && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/70">
              {msg}
            </div>
          )}
        </div>

        {/* Durum çubuğu — telefon testinde tanı için kritik */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge label="Durum" value={status} />
          <Badge label="El" value={String(handsDetected)} />
          <Badge label="FPS" value={String(fps)} />
          <Badge
            label="Güvenli"
            value={secure === null ? "…" : secure ? "HTTPS ✓" : "HAYIR ✗"}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {status !== "running" ? (
            <button
              onClick={start}
              disabled={status === "loading"}
              className="rounded-full bg-gradient-to-r from-[#c4838b] to-[#a65f69] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {status === "loading" ? "Yükleniyor…" : "Kamerayı Başlat"}
            </button>
          ) : (
            <button
              onClick={stop}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm"
            >
              Durdur
            </button>
          )}
          <button
            onClick={() =>
              setFacing((f) => (f === "environment" ? "user" : "environment"))
            }
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm"
          >
            Kamera çevir ({facing === "environment" ? "arka" : "ön"})
          </button>
        </div>

        {status === "running" && (
          <p className="mt-3 text-xs text-white/40">{msg}</p>
        )}
      </div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
      <span className="text-white/40">{label}: </span>
      <span className="font-mono text-white/80">{value}</span>
    </span>
  );
}

// Landmark iskeleti — parmağın takip edildiğini görmek için
function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  lm: { x: number; y: number }[],
  w: number,
  h: number
) {
  ctx.fillStyle = "rgba(200,149,108,0.9)";
  for (const p of lm) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Yüzük parmağı proksimal falanksına altın halka çiz
function drawRing(
  ctx: CanvasRenderingContext2D,
  lm: { x: number; y: number }[],
  w: number,
  h: number
) {
  const mcp = lm[RING_MCP];
  const pip = lm[RING_PIP];
  if (!mcp || !pip) return;

  // Halka merkezi: taban ile boğum arası (tabana yakın)
  const cx = (mcp.x * 0.55 + pip.x * 0.45) * w;
  const cy = (mcp.y * 0.55 + pip.y * 0.45) * h;

  // Parmak segment uzunluğu → halka genişliği tahmini
  const dx = (pip.x - mcp.x) * w;
  const dy = (pip.y - mcp.y) * h;
  const segLen = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  const ringW = segLen * 0.95; // parmak genişliği ~ segment
  const ringH = segLen * 0.42; // bant kalınlığı (perspektif eliptik)

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle + Math.PI / 2); // parmağa dik bant
  const grad = ctx.createLinearGradient(-ringW / 2, 0, ringW / 2, 0);
  grad.addColorStop(0, "#8a5a1e");
  grad.addColorStop(0.5, "#f4d98b");
  grad.addColorStop(1, "#8a5a1e");
  ctx.lineWidth = Math.max(4, ringH * 0.5);
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, ringW / 2, ringH / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
