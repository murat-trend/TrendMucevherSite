import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  void req
  return NextResponse.json(
    {
      error: 'Bu endpoint kullanımdan kaldırıldı. Thumbnail yüklemeleri artık /api/create-upload-url üzerinden direct-to-R2 çalışır.',
      deprecated: true,
    },
    { status: 410 },
  )
}
