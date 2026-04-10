import { randomUUID } from 'node:crypto'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import {
  Document,
  NodeIO,
} from '@gltf-transform/core'
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, prune, weld, reorder } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { MeshoptEncoder } from 'meshoptimizer'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const LOG_PREFIX = '[mesh-optimize]'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/\.(glb|stl)$/i, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function stlToDocument(bytes: Uint8Array): Document {
  const header = String.fromCharCode(...bytes.slice(0, 5))
  const isAscii = header.toLowerCase() === 'solid'

  const positions: number[] = []
  const normals: number[] = []

  if (isAscii) {
    const text = new TextDecoder().decode(bytes)
    const lines = text.split('\n').map(l => l.trim())
    let nx = 0, ny = 0, nz = 0
    for (const line of lines) {
      if (line.startsWith('facet normal')) {
        const parts = line.split(/\s+/)
        nx = parseFloat(parts[2]); ny = parseFloat(parts[3]); nz = parseFloat(parts[4])
      } else if (line.startsWith('vertex')) {
        const parts = line.split(/\s+/)
        positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]))
        normals.push(nx, ny, nz)
      }
    }
  } else {
    if (bytes.byteLength < 84) throw new Error('Geçersiz STL dosyası.')
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const triCount = view.getUint32(80, true)
    const expectedSize = 84 + triCount * 50
    if (Math.abs(bytes.byteLength - expectedSize) > 10) throw new Error('Geçersiz binary STL.')
    let offset = 84
    for (let i = 0; i < triCount; i++) {
      const nx = view.getFloat32(offset, true)
      const ny = view.getFloat32(offset + 4, true)
      const nz = view.getFloat32(offset + 8, true)
      offset += 12
      for (let v = 0; v < 3; v++) {
        positions.push(view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true))
        normals.push(nx, ny, nz)
        offset += 12
      }
      offset += 2
    }
  }

  if (positions.length === 0) throw new Error('STL dosyasında geometri bulunamadı.')

  const doc    = new Document()
  const buf    = doc.createBuffer()
  const posAcc = doc.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buf)
  const nrmAcc = doc.createAccessor().setType('VEC3').setArray(new Float32Array(normals)).setBuffer(buf)
  const prim   = doc.createPrimitive().setAttribute('POSITION', posAcc).setAttribute('NORMAL', nrmAcc)
  const mesh   = doc.createMesh('mesh').addPrimitive(prim)
  const node   = doc.createNode('node').setMesh(mesh)
  doc.createScene('scene').addChild(node)
  return doc
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      console.error(LOG_PREFIX, 'Bad Content-Type:', contentType)
      return NextResponse.json(
        { error: `Beklenen multipart/form-data, gelen: ${contentType}` },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı. Form alanı adı "file" olmalı.' },
        { status: 400 }
      )
    }

    const name = file.name.toLowerCase()
    const isGlb = name.endsWith('.glb')
    const isStl = name.endsWith('.stl')

    if (!isGlb && !isStl) {
      return NextResponse.json(
        { error: 'Sadece .glb ve .stl dosyaları desteklenir.' },
        { status: 400 }
      )
    }

    const sourceBytes = new Uint8Array(await file.arrayBuffer())

    const [encoderModule, decoderModule] = await Promise.all([
      draco3d.createEncoderModule(),
      draco3d.createDecoderModule(),
    ])

    const io = new NodeIO()
      .registerExtensions(KHRONOS_EXTENSIONS)
      .registerDependencies({
        'draco3d.encoder': encoderModule,
        'draco3d.decoder': decoderModule,
      })

    // STL → Document dönüşümü veya GLB okuma
    const document = isStl
      ? stlToDocument(sourceBytes)
      : await io.readBinary(sourceBytes)

    await MeshoptEncoder.ready

    await document.transform(
      weld(),    // duplicate vertex birleştir, non-manifold kapat
      dedup(),   // tekrar eden accessor/texture/material kaldır
      prune(),   // kullanılmayan node/mesh/texture temizle
      reorder({ encoder: MeshoptEncoder }), // vertex cache optimizasyonu
      draco(),   // sıkıştır
    )

    const optimizedBytes = await io.writeBinary(document)

    const accountId   = getRequiredEnv('R2_ACCOUNT_ID')
    const accessKeyId = getRequiredEnv('R2_ACCESS_KEY_ID')
    const secretKey   = getRequiredEnv('R2_SECRET_ACCESS_KEY')
    const bucket      = getRequiredEnv('R2_BUCKET_NAME')
    const publicBase  = getRequiredEnv('R2_PUBLIC_BASE_URL')

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey: secretKey },
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

    const url = `${publicBase.replace(/\/$/, '')}/${key}`

    const reduction = (
      ((sourceBytes.byteLength - optimizedBytes.byteLength) / sourceBytes.byteLength) * 100
    ).toFixed(1)

    console.log(
      LOG_PREFIX,
      `${file.name} → ${key} | ${(sourceBytes.byteLength / 1024).toFixed(0)} KB → ${(optimizedBytes.byteLength / 1024).toFixed(0)} KB (-%${reduction})`
    )

    return NextResponse.json({
      url,
      key,
      originalSize: sourceBytes.byteLength,
      optimizedSize: optimizedBytes.byteLength,
      reductionPercent: parseFloat(reduction),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown optimization error'
    console.error(LOG_PREFIX, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
