import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify ownership
  const { data: hir } = await supabase
    .from('health_intelligence_reports')
    .select('id, user_id, pdf_storage_path, download_count, created_at, status')
    .eq('id', id)
    .single()

  if (!hir) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (hir.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (hir.status !== 'complete') return NextResponse.json({ error: 'Report is not ready' }, { status: 400 })

  // Check 12-month expiry
  const createdAt = new Date(hir.created_at)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
  if (createdAt < twelveMonthsAgo) {
    return NextResponse.json({ error: 'Report has expired (12-month limit)' }, { status: 410 })
  }

  if (!hir.pdf_storage_path) {
    return NextResponse.json({ error: 'PDF not found for this report' }, { status: 404 })
  }

  // Generate fresh signed URL (24hr)
  const { data } = await supabase.storage
    .from('hir-reports')
    .createSignedUrl(hir.pdf_storage_path, 86400)

  if (!data?.signedUrl) return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })

  // Increment download count
  await supabase
    .from('health_intelligence_reports')
    .update({ download_count: (hir.download_count || 0) + 1 })
    .eq('id', id)

  return NextResponse.json({ download_url: data.signedUrl })
}
