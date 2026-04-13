"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  RemauraBillingModalProvider,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider"
import { useRemauraCreditsCheck } from "@/hooks/useRemauraCreditsCheck"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))])
}

/** ffmpeg.wasm MEMFS: sadece basit uzanti (ozel karakter yok) */
function safeFfmpegExt(filename: string): string {
  const raw = (filename.split(".").pop() ?? "mp4").toLowerCase().replace(/[^a-z0-9]/g, "")
  if (!raw || raw.length > 8) return "mp4"
  return raw
}

function blobFromFileData(data: Uint8Array | string, type: string): Blob {
  if (typeof data === "string") return new Blob([data], { type })
  return new Blob([data as BlobPart], { type })
}

async function ffmpegDeleteQuiet(ffmpeg: FFmpeg, name: string) {
  try {
    await ffmpeg.deleteFile(name)
  } catch {
    /* yoksa sorun degil */
  }
}

export default function SesStudioPage() {
  return (
    <RemauraBillingModalProvider>
      <SesStudioPageInner />
    </RemauraBillingModalProvider>
  )
}

function SesStudioPageInner() {
  const { t } = useLanguage()
  const s = t.studio
  const billingUi = useRemauraBillingModal()
  const { checkCredits } = useRemauraCreditsCheck()
  const sourceInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  async function openSourcePicker() {
    if (!(await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits))) return
    sourceInputRef.current?.click()
  }

  async function openVideoPicker() {
    if (!(await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits))) return
    videoInputRef.current?.click()
  }

  // Kaynak — video veya ses
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<"video" | "audio" | null>(null)

  // Cikarilan/yuklenen ses
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)

  // Trim
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)

  // Volume / Fade
  const [volume, setVolume] = useState(100) // 0-200%
  const [fadeIn, setFadeIn] = useState(0) // saniye
  const [fadeOut, setFadeOut] = useState(0) // saniye

  // Video birlestirme
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoName, setVideoName] = useState("")

  // Islem durumu
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState("")
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultType, setResultType] = useState<"audio" | "video">("audio")

  const ffmpegRef = useRef<FFmpeg | null>(null)
  const ffmpegLoaded = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Ses yuklenince suresini al
  useEffect(() => {
    if (!audioFile) {
      setAudioDuration(0)
      setTrimStart(0)
      setTrimEnd(0)
      setAudioPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(audioFile)
    setAudioPreviewUrl(url)
    const a = new Audio(url)
    a.onloadedmetadata = () => {
      const dur = Math.ceil(a.duration)
      setAudioDuration(dur)
      setTrimStart(0)
      setTrimEnd(dur)
      setFadeIn(0)
      setFadeOut(0)
    }
    audioRef.current = a
    return () => URL.revokeObjectURL(url)
  }, [audioFile])

  async function ensureFfmpegLoaded() {
    if (!ffmpegRef.current) ffmpegRef.current = new FFmpeg()
    if (ffmpegLoaded.current) return ffmpegRef.current
    setProgress("FFmpeg yukleniyor...")
    const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
    await ffmpegRef.current.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    })
    ffmpegLoaded.current = true
    return ffmpegRef.current
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSourceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith("video/")
    const isAudio = file.type.startsWith("audio/")
    setSourceFile(file)
    setSourceType(isVideo ? "video" : isAudio ? "audio" : null)
    setAudioFile(null)
    setResultBlob(null)
    setProgress("")
    // Eger ses dosyasiysa direkt ses olarak yukle
    if (isAudio) setAudioFile(file)
  }

  function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoFile(file)
    setVideoName(file.name)
  }

  // Video'dan sesi ayir
  async function handleExtract() {
    if (!sourceFile || sourceType !== "video") return
    if (!(await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits))) return
    setProcessing(true)
    setResultBlob(null)
    const ffmpeg = await ensureFfmpegLoaded()
    const ext = safeFfmpegExt(sourceFile.name)
    const inName = `src.${ext}`
    const outName = "extracted.m4a"
    try {
      setProgress("Video yukleniyor...")
      const data = new Uint8Array(await sourceFile.arrayBuffer())
      await ffmpeg.writeFile(inName, data)
      setProgress("Ses ayristiriliyor...")
      // libmp3lame cekirdekte yok / FS hatasina yol acabiliyor; AAC m4a wasm ile uyumlu
      await ffmpeg.exec(["-i", inName, "-vn", "-acodec", "aac", "-b:a", "192k", outName])
      const out = await ffmpeg.readFile(outName)
      const blob = blobFromFileData(out, "audio/mp4")
      const file = new File([blob], `${sourceFile.name.replace(/\.[^.]+$/, "")}_ses.m4a`, { type: "audio/mp4" })
      setAudioFile(file)
      setProgress("✓ Ses ayristirildi! Duzenleyebilirsin.")
    } catch (err) {
      console.error(err)
      setProgress(
        err instanceof Error && err.message ? `Hata: ${err.message}` : "Hata olustu (FFmpeg / tarayici)."
      )
    } finally {
      await ffmpegDeleteQuiet(ffmpeg, inName)
      await ffmpegDeleteQuiet(ffmpeg, outName)
      setProcessing(false)
    }
  }

  // Sesi isle (trim + volume + fade) ve indir / videoya ekle
  async function handleProcess(mode: "audio" | "video") {
    if (!audioFile) return
    if (mode === "video" && !videoFile) {
      window.alert("Lutfen video yukle.")
      return
    }
    if (!(await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits))) return
    setProcessing(true)
    setResultBlob(null)
    const ffmpeg = await ensureFfmpegLoaded()
    const aExt = safeFfmpegExt(audioFile.name)
    const audioIn = `audio.${aExt}`
    const processedName = "processed.m4a"
    let videoIn: string | null = null
    try {
      // Ses dosyasini yaz
      setProgress("Ses yukleniyor...")
      const aData = new Uint8Array(await audioFile.arrayBuffer())
      await ffmpeg.writeFile(audioIn, aData)

      // Volume filtresi — 0-200% → 0.0-2.0
      const vol = volume / 100
      const trimDur = trimEnd - trimStart
      const safeFadeIn = Math.min(fadeIn, trimDur / 2)
      const safeFadeOut = Math.min(fadeOut, trimDur / 2)

      // Filtreler: trim + volume + fade
      let audioFilter = `volume=${vol}`
      if (safeFadeIn > 0) audioFilter += `,afade=t=in:st=0:d=${safeFadeIn}`
      if (safeFadeOut > 0) audioFilter += `,afade=t=out:st=${trimDur - safeFadeOut}:d=${safeFadeOut}`

      setProgress("Ses isleniyor...")
      await ffmpeg.exec([
        "-ss",
        String(trimStart),
        "-t",
        String(trimDur),
        "-i",
        audioIn,
        "-af",
        audioFilter,
        "-acodec",
        "aac",
        "-b:a",
        "192k",
        processedName,
      ])

      if (mode === "audio") {
        const out = await ffmpeg.readFile(processedName)
        const blob = blobFromFileData(out, "audio/mp4")
        setResultBlob(blob)
        setResultType("audio")
        downloadBlob(blob, `ses_${Date.now()}.m4a`)
        setProgress("✓ Ses hazir!")
      } else {
        // Videoya ekle
        setProgress("Video yukleniyor...")
        const vData = new Uint8Array(await videoFile!.arrayBuffer())
        const vExt = safeFfmpegExt(videoFile!.name)
        videoIn = `video.${vExt}`
        await ffmpeg.writeFile(videoIn, vData)
        setProgress("Video + ses birlestiriliyor...")
        await ffmpeg.exec([
          "-i",
          videoIn,
          "-i",
          processedName,
          "-map",
          "0:v:0",
          "-map",
          "1:a:0",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-shortest",
          "final.mp4",
        ])
        const out = await ffmpeg.readFile("final.mp4")
        const blob = blobFromFileData(out, "video/mp4")
        setResultBlob(blob)
        setResultType("video")
        downloadBlob(blob, `video_muzikli_${Date.now()}.mp4`)
        setProgress("✓ Video + ses hazir!")
      }
    } catch (err) {
      console.error(err)
      setProgress(
        err instanceof Error && err.message ? `Hata: ${err.message}` : "Hata olustu (FFmpeg / tarayici)."
      )
    } finally {
      await ffmpegDeleteQuiet(ffmpeg, audioIn)
      await ffmpegDeleteQuiet(ffmpeg, processedName)
      if (videoIn) await ffmpegDeleteQuiet(ffmpeg, videoIn)
      await ffmpegDeleteQuiet(ffmpeg, "final.mp4")
      setProcessing(false)
    }
  }

  const trimDur = trimEnd - trimStart

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", padding: "2rem" }}>
      {/* Baslik */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "0.3em",
            color: "#c9a84c",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          Trend Mucevher
        </div>
        <div style={{ fontSize: "1.4rem", fontFamily: "var(--font-serif)", fontWeight: 300 }}>{s.title}</div>
        <div style={{ fontSize: "11px", color: "#4a4642", marginTop: "4px" }}>{s.subtitle}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", maxWidth: "900px" }}>
        {/* SOL — KAYNAK */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Kaynak yukleme */}
          <div style={cardStyle}>
            <div style={sectionLabel}>1. Kaynak Yukle</div>
            <button type="button" onClick={() => void openSourcePicker()} style={uploadBtnStyle}>
              {sourceFile ? `✓ ${sourceFile.name}` : "🎬 Video veya 🎵 Ses Yukle"}
            </button>
            <input
              ref={sourceInputRef}
              type="file"
              accept="video/*,audio/*"
              onChange={handleSourceUpload}
              style={{ display: "none" }}
            />
            {sourceFile && (
              <div style={{ fontSize: "10px", color: "#4a4642", marginTop: "6px" }}>
                Tur: {sourceType === "video" ? "🎬 Video" : "🎵 Ses"} · {(sourceFile.size / 1024 / 1024).toFixed(1)} MB
              </div>
            )}
            {sourceType === "video" && !audioFile && (
              <button
                onClick={handleExtract}
                disabled={processing}
                style={{ ...btnStyle, marginTop: "8px", color: "#c9a84c", borderColor: "rgba(201,168,76,0.4)" }}
              >
                {processing ? "⏳ Ayristiriliyor..." : "✂️ Videodan Sesi Ayir"}
              </button>
            )}
          </div>

          {/* Ses Onizleme */}
          {audioFile && audioDuration > 0 && (
            <div style={cardStyle}>
              <div style={sectionLabel}>2. Sesi Dinle & Kes</div>
              {audioPreviewUrl && (
                <audio controls src={audioPreviewUrl} style={{ width: "100%", marginBottom: "12px", height: "32px" }} />
              )}

              {/* Trim baslangic */}
              <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={sliderLabel}>Baslangic</span>
                  <span style={sliderValue}>{fmtTime(trimStart)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={audioDuration}
                  step={1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 1))}
                  style={{ width: "100%", accentColor: "#c9a84c" }}
                />
              </div>

              {/* Trim bitis */}
              <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={sliderLabel}>Bitis</span>
                  <span style={sliderValue}>{fmtTime(trimEnd)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={audioDuration}
                  step={1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 1))}
                  style={{ width: "100%", accentColor: "#c9a84c" }}
                />
              </div>

              <div
                style={{
                  fontSize: "10px",
                  color: "#c9a84c",
                  textAlign: "center",
                  padding: "6px",
                  background: "rgba(201,168,76,0.08)",
                  borderRadius: "2px",
                }}
              >
                Secili: {fmtTime(trimStart)} → {fmtTime(trimEnd)} · Sure: {fmtTime(trimDur)}
              </div>
            </div>
          )}
        </div>

        {/* SAG — SES AYARLARI + CIKTI */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {audioFile && audioDuration > 0 && (
            <>
              {/* Volume + Fade */}
              <div style={cardStyle}>
                <div style={sectionLabel}>3. Ses Ayarlari</div>

                {/* Volume */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={sliderLabel}>🔊 Ses Seviyesi</span>
                    <span style={sliderValue}>{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#c9a84c" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "9px",
                      color: "#4a4642",
                      marginTop: "2px",
                    }}
                  >
                    <span>Sessiz</span>
                    <span>Normal</span>
                    <span>2x Guclu</span>
                  </div>
                </div>

                {/* Fade In */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={sliderLabel}>↗ Fade In (Giris)</span>
                    <span style={sliderValue}>{fadeIn}sn</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.floor(trimDur / 2)}
                    step={1}
                    value={fadeIn}
                    onChange={(e) => setFadeIn(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#c9a84c" }}
                  />
                </div>

                {/* Fade Out */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={sliderLabel}>↘ Fade Out (Cikis)</span>
                    <span style={sliderValue}>{fadeOut}sn</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.floor(trimDur / 2)}
                    step={1}
                    value={fadeOut}
                    onChange={(e) => setFadeOut(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#c9a84c" }}
                  />
                </div>
              </div>

              {/* Cikis */}
              <div style={cardStyle}>
                <div style={sectionLabel}>4. Cikis</div>

                {/* Sadece ses indir */}
                <button
                  onClick={() => handleProcess("audio")}
                  disabled={processing}
                  style={{ ...btnStyle, color: "#c9a84c", borderColor: "rgba(201,168,76,0.4)", marginBottom: "8px" }}
                >
                  {processing ? "⏳ Isleniyor..." : "⬇ Sesi Indir (MP3)"}
                </button>

                {/* Videoya ekle */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "10px", marginTop: "4px" }}>
                  <div style={labelStyle}>Videona Ekle</div>
                  <button type="button" onClick={() => void openVideoPicker()} style={uploadBtnStyle}>
                    {videoName || "🎬 Video Yukle (MP4...)"}
                  </button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    style={{ display: "none" }}
                  />
                  {videoFile && (
                    <button
                      onClick={() => handleProcess("video")}
                      disabled={processing}
                      style={{ ...btnStyle, marginTop: "8px", color: "#c9a84c", borderColor: "rgba(201,168,76,0.4)" }}
                    >
                      {processing ? "⏳ Birlestiriliyor..." : "🎬 Video + Ses Birlestir"}
                    </button>
                  )}
                </div>

                {/* Progress */}
                {progress ? (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#c9a84c",
                      marginTop: "10px",
                      textAlign: "center",
                      padding: "6px",
                      background: "rgba(201,168,76,0.08)",
                      borderRadius: "2px",
                    }}
                  >
                    {progress}
                  </div>
                ) : null}

                {/* Tekrar indir */}
                {resultBlob && !processing && (
                  <button
                    onClick={() =>
                      downloadBlob(resultBlob, resultType === "audio" ? `ses_${Date.now()}.m4a` : `video_muzikli_${Date.now()}.mp4`)
                    }
                    style={{ ...btnStyle, marginTop: "8px", color: "#c9a84c", borderColor: "rgba(201,168,76,0.5)" }}
                  >
                    ⬇ Tekrar Indir
                  </button>
                )}
              </div>
            </>
          )}

          {!audioFile && (
            <div
              style={{
                ...cardStyle,
                alignItems: "center",
                justifyContent: "center",
                minHeight: "200px",
                opacity: 0.3,
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎵</div>
              <div style={{ fontSize: "11px", color: "#4a4642", textAlign: "center" }}>Soldan video veya ses yukle</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "4px",
  padding: "1rem",
}

const sectionLabel: React.CSSProperties = {
  fontSize: "9px",
  letterSpacing: "0.2em",
  color: "#c9a84c",
  textTransform: "uppercase",
  marginBottom: "12px",
}

const labelStyle: React.CSSProperties = {
  fontSize: "9px",
  letterSpacing: "0.2em",
  color: "#4a4642",
  textTransform: "uppercase",
  marginBottom: "8px",
}

const sliderLabel: React.CSSProperties = {
  fontSize: "10px",
  color: "#8a8278",
}

const sliderValue: React.CSSProperties = {
  fontSize: "10px",
  color: "#c9a84c",
  fontVariantNumeric: "tabular-nums",
}

const btnStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#8a8278",
  fontSize: "12px",
  letterSpacing: "0.05em",
  borderRadius: "2px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  textAlign: "left" as const,
}

const uploadBtnStyle: React.CSSProperties = {
  ...btnStyle,
  justifyContent: "center",
  cursor: "pointer",
}
