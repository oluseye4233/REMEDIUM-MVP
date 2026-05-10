import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateHIR } from '@/lib/erb/orchestrator'
import { groPreFlight } from '@/lib/erb/gro'
import type { HIRRequest } from '@/types'

export async function POST(req: Request) {
  const serviceKey = req.headers.get('x-service-key')
  if (serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { hir_id, user_id } = await req.json() as { hir_id: string; user_id: string }
  const supabase = await createServiceClient()

  const { data: hir } = await supabase
    .from('health_intelligence_reports')
    .select('*')
    .eq('id', hir_id)
    .eq('user_id', user_id)
    .single()

  if (!hir || hir.status === 'complete') {
    return NextResponse.json({ status: hir?.status || 'not_found' })
  }

  const params = hir.query_input as HIRRequest
  const { mode } = groPreFlight(params.health_topic, params.domains_requested)

  try {
    const { downloadUrl } = await generateHIR(hir_id, user_id, params, mode)
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single()

    return NextResponse.json({
      status: 'complete',
      download_url: downloadUrl,
      email: profile?.email,
    })
  } catch (error) {
    return NextResponse.json({ status: 'failed', error: (error as Error).message }, { status: 500 })
  }
}
