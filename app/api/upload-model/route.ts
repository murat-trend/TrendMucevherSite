import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  console.log('STEP 1: route hit')

  let formData: FormData

  try {
    formData = await req.formData()
    console.log('STEP 2: formData parsed')
  } catch (e) {
    console.error('STEP 2 FAILED', e)
    return NextResponse.json({ error: 'form parse failed' }, { status: 400 })
  }

  const slug = formData.get('slug')
  console.log('STEP 3 slug:', slug)

  const glb = formData.get('glb') as File | null
  const stl = formData.get('stl') as File | null

  console.log('STEP 4 sizes:', {
    glb: glb?.size,
    stl: stl?.size,
  })

  return NextResponse.json({ ok: true })
}
