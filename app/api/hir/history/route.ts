import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')
  const hirType = searchParams.get('hir_type')
  const evidenceGrade = searchParams.get('evidence_grade')

  let query = supabase
    .from('health_intelligence_reports')
    .select('id, hir_type, evidence_grade, atlas_sections, download_count, status, created_at, query_input')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (hirType) query = query.eq('hir_type', hirType)
  if (evidenceGrade) query = query.eq('evidence_grade', evidenceGrade)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ reports: data || [], total: count || 0, offset, limit })
}
