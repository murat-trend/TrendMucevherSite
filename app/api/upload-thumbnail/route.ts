import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const slug = formData.get('slug') as string
  const viewRaw = String(formData.get('view') ?? '').trim().toLowerCase()
  const view = viewRaw === 'on' || viewRaw === 'arka' || viewRaw === 'kenar' || viewRaw === 'ust' ? viewRaw : ''

  if (!file || !slug) {
    return NextResponse.json({ error: 'Dosya veya slug eksik' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  /** Tüm vitrin görselleri aynı kare kanvas (katalogda tutarlı kırpım) */
  const THUMB_SIZE = 1200

  const webpBuffer = await sharp(buffer)
    .rotate()
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer()

  // Kaydet
  const thumbnailsDir = path.join(process.cwd(), 'public', 'thumbnails')
  await mkdir(thumbnailsDir, { recursive: true })
  const filename = view ? `${slug}-${view}.webp` : `${slug}.webp`
  const filePath = path.join(thumbnailsDir, filename)
  await writeFile(filePath, webpBuffer)

  return NextResponse.json({
    url: `/thumbnails/${filename}`,
    originalSize: buffer.length,
    webpSize: webpBuffer.length,
  })
}
