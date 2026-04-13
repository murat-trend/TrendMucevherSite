import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const GLB_RECOMMENDED_SIZE = 25 * 1024 * 1024
const GLB_MAX_SIZE = 50 * 1024 * 1024
const STL_RECOMMENDED_SIZE = 50 * 1024 * 1024
const STL_MAX_SIZE = 100 * 1024 * 1024
const THUMBNAIL_MAX_SIZE = 10 * 1024 * 1024
const SIGNED_URL_EXPIRES_SECONDS = 60 * 5

const THUMBNAIL_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

const THUMBNAIL_EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

type UploadKind = 'glb' | 'stl' | 'thumbnail'
type ThumbnailView = 'on' | 'arka' | 'kenar' | 'ust'

function errorJson(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : ''
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug)
}

export async function POST(req: NextRequest) {
  if (
    !process.env.R2_ENDPOINT ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET_NAME ||
    !process.env.R2_PUBLIC_BASE_URL
  ) {
    return errorJson('R2 yapılandırması eksik', 500)
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorJson('Oturum gerekli', 401)
  }

  let body: {
    slug?: string
    fileName?: string
    contentType?: string
    size?: number
    kind?: UploadKind
    view?: ThumbnailView
  }

  try {
    body = (await req.json()) as typeof body
  } catch {
    return errorJson('Geçersiz istek gövdesi', 400)
  }

  const slug = normalizeText(body.slug)
  const fileName = normalizeText(body.fileName)
  const contentType = normalizeText(body.contentType)
  const size = Number(body.size)
  const kind = body.kind
  const view = body.view

  if (!slug || !validateSlug(slug)) {
    return errorJson('Geçersiz slug formatı', 400)
  }

  if (!fileName) {
    return errorJson('Dosya adı gerekli', 400)
  }

  if (!Number.isFinite(size) || size <= 0) {
    return errorJson('Geçersiz dosya boyutu', 400)
  }

  if (kind !== 'glb' && kind !== 'stl' && kind !== 'thumbnail') {
    return errorJson('Geçersiz yükleme türü', 400)
  }

  let key = ''
  let normalizedContentType = contentType

  if (kind === 'glb') {
    if (getFileExtension(fileName) !== 'glb') {
      return errorJson('Geçersiz GLB dosyası', 400)
    }
    if (size > GLB_MAX_SIZE) {
      return errorJson('GLB dosyası en fazla 50 MB olabilir', 413)
    }
    if (contentType && !['model/gltf-binary', 'application/octet-stream'].includes(contentType)) {
      return errorJson('Geçersiz GLB içerik tipi', 400)
    }
    normalizedContentType = 'model/gltf-binary'
    key = `models/${slug}.glb`
  }

  if (kind === 'stl') {
    if (getFileExtension(fileName) !== 'stl') {
      return errorJson('Geçersiz STL dosyası', 400)
    }
    if (size > STL_MAX_SIZE) {
      return errorJson(
        '100 MB üzerindeki STL dosyaları desteklenmiyor. Lütfen modeli optimize edip tekrar yükleyin.',
        413,
      )
    }
    if (
      contentType &&
      !['model/stl', 'application/sla', 'application/octet-stream', 'model/x.stl-binary'].includes(contentType)
    ) {
      return errorJson('Geçersiz STL içerik tipi', 400)
    }
    normalizedContentType = 'model/stl'
    key = `models/${slug}.stl`
  }

  if (kind === 'thumbnail') {
    if (!view || !['on', 'arka', 'kenar', 'ust'].includes(view)) {
      return errorJson('Geçersiz görünüm', 400)
    }
    if (size > THUMBNAIL_MAX_SIZE) {
      return errorJson('Thumbnail görseli en fazla 10 MB olabilir', 413)
    }
    if (!THUMBNAIL_CONTENT_TYPES.has(contentType)) {
      return errorJson('Sadece JPG, PNG, WebP ve GIF desteklenir', 400)
    }
    const ext = THUMBNAIL_EXT_BY_TYPE[contentType] ?? getFileExtension(fileName)
    if (!ext) {
      return errorJson('Geçersiz thumbnail uzantısı', 400)
    }
    key = `thumbnails/${slug}-${view}.${ext}`
  }

  try {
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        ContentType: normalizedContentType,
      }),
      { expiresIn: SIGNED_URL_EXPIRES_SECONDS },
    )

    return NextResponse.json({
      uploadUrl,
      publicUrl: `${process.env.R2_PUBLIC_BASE_URL}/${key}`,
      key,
    })
  } catch (e) {
    console.error('[create-upload-url] failed:', e)
    return errorJson('Yükleme bağlantısı oluşturulamadı', 500)
  }
}
