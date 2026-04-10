import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const slug = formData.get('slug') as string | null
  const view = formData.get('view') as string | null

  if (!file || !slug) {
    return NextResponse.json({ error: 'Dosya veya slug eksik' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer()

  const filename = view ? `${slug}-${view}.webp` : `${slug}.webp`
  const key = `thumbnails/${filename}`

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: webpBuffer,
    ContentType: 'image/webp',
  }))

  const url = `${process.env.R2_PUBLIC_BASE_URL}/${key}`

  return NextResponse.json({
    url,
    originalSize: buffer.length,
    webpSize: webpBuffer.length,
  })
}
