import { randomUUID } from 'node:crypto'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NodeIO } from '@gltf-transform/core'
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, prune } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/\.glb$/i, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No GLB file provided. Use form field name "file".' },
        { status: 400 }
      )
    }

    const isGlbName = file.name.toLowerCase().endsWith('.glb')
    if (!isGlbName) {
      return NextResponse.json({ error: 'Only .glb files are supported.' }, { status: 400 })
    }

    const sourceBytes = new Uint8Array(await file.arrayBuffer())

    const io = new NodeIO()
      .registerExtensions(KHRONOS_EXTENSIONS)
      .registerDependencies({
        'draco3d.encoder': await draco3d.createEncoderModule(),
      })

    const document = await io.readBinary(sourceBytes)
    await document.transform(dedup(), prune(), draco())
    const optimizedBytes = io.writeBinary(document)

    const accountId = getRequiredEnv('R2_ACCOUNT_ID')
    const accessKeyId = getRequiredEnv('R2_ACCESS_KEY_ID')
    const secretAccessKey = getRequiredEnv('R2_SECRET_ACCESS_KEY')
    const bucket = getRequiredEnv('R2_BUCKET_NAME')
    const publicBaseUrl = getRequiredEnv('R2_PUBLIC_BASE_URL')

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })

    const safeName = sanitizeFileName(file.name) || 'model'
    const key = `models/${safeName}-${randomUUID()}.glb`

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(optimizedBytes),
        ContentType: 'model/gltf-binary',
      })
    )

    const base = publicBaseUrl.replace(/\/$/, '')
    const url = `${base}/${key}`

    return NextResponse.json({
      url,
      key,
      originalSize: sourceBytes.byteLength,
      optimizedSize: optimizedBytes.byteLength,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown optimization error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
