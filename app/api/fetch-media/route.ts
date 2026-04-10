import { NextRequest, NextResponse } from "next/server"
import https from "node:https"
import http from "node:http"

export const runtime = "nodejs"

function fetchWithNodeHttp(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http
    const options = new URL(url)
    client.get(options, (res) => {
      const chunks: Buffer[] = []
      res.on("data", (chunk: Buffer) => chunks.push(chunk))
      res.on("end", () => {
        const buffer = Buffer.concat(chunks)
        const rawCt = res.headers["content-type"]
        const contentType =
          (Array.isArray(rawCt) ? rawCt[0] : rawCt) ?? "application/octet-stream"
        resolve({ buffer, contentType })
      })
      res.on("error", reject)
    }).on("error", reject)
  })
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  if (!url) {
    return NextResponse.json({ error: "url parametresi eksik" }, { status: 400 })
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: "Geçersiz URL" }, { status: 400 })
  }

  try {
    const { buffer, contentType } = await fetchWithNodeHttp(url)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (err) {
    console.error(
      "[fetch-media] hata:",
      JSON.stringify(err, Object.getOwnPropertyNames(Object(err as object)))
    )
    return NextResponse.json(
      {
        error: "Dosya alınamadı",
        detail: err instanceof Error ? err.message : String(err),
        code: (err as NodeJS.ErrnoException).code,
        cause: String((err as NodeJS.ErrnoException).cause ?? ""),
      },
      { status: 500 }
    )
  }
}
