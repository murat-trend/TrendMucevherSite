import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'
export const maxDuration = 60 // büyük dosyalar için timeout

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
  const slug = formData.get('slug') as string | null
  const glb = formData.get('glb') as File | null
  const stl = formData.get('stl') as File | null

  if (!slug) {
    return NextResponse.json({ error: 'Slug eksik' }, { status: 400 })
  }

  const payload: { slug: string; glbUrl?: string; stlUrl?: string } = { slug }

  if (glb) {
    const buffer = Buffer.from(await glb.arrayBuffer())
    const key = `models/${slug}.glb`
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: 'model/gltf-binary',
    }))
    payload.glbUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`
  }

  if (stl) {
    const buffer = Buffer.from(await stl.arrayBuffer())
    const key = `models/${slug}.stl`
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: 'model/stl',
    }))
    payload.stlUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`
  }

  return NextResponse.json(payload)
}
