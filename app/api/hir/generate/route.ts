import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { groPreFlight } from '@/lib/erb/gro'
import { routeAtlasPrompts } from '@/lib/erb/atlas-router'
import { generateHIR } from '@/lib/erb/orchestrator'
import type { GROMode } from '@/types'

const GRO_SEVERITY: Record<GROMode, number> = { LIFE: 0, SAFE_LIFE: 1, CONTAINMENT: 2 }
const GRO_BY_LEVEL: GROMode[] = ['LIFE', 'SAFE_LIFE', 'CONTAINMENT']

function elevateGROMode(profileMode: GROMode, preFlightMode: GROMode): GROMode {
  return GRO_BY_LEVEL[Math.max(GRO_SEVERITY[profileMode], GRO_SEVERITY[preFlightMode])]
}

const schema = z.object({
  report_type: z.enum(['standard', 'integrative', 'pharmacognosy', 'nutritional', 'wellness']),
  health_topic: z.string().min(10).max(500),
  domains_requested: z.array(z.enum([
    'Pharmacy', 'Herbal', 'Nutrition', 'Fitness', 'Wellness', 'Pharmacognosy', 'Integrative',
  ])).min(1).max(7),
  evidence_threshold: z.enum(['A', 'B', 'C']),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const params = schema.parse(body)

    // Load profile for gates
    const { data: profile } = await supabase
      .from('profiles')
      .select('cvs_status, report_credits, gro_mode, practitioner_type')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Gate 1: CVS must be verified
    if (profile.cvs_status !== 'verified') {
      return NextResponse.json({
        error: 'Credential verification required before generating reports.',
        redirect: '/cvs/status',
      }, { status: 403 })
    }

    // Gate 2: Credits available
    if (profile.report_credits < 1) {
      return NextResponse.json({
        error: 'Insufficient report credits. Please purchase more credits.',
        redirect: '/billing',
      }, { status: 402 })
    }

    // GRO pre-flight — elevate to highest of profile setting vs topic scan
    const { mode: preFlightMode, harm_score, triggered_terms } = groPreFlight(
      params.health_topic,
      params.domains_requested
    )
    const mode = elevateGROMode(profile.gro_mode as GROMode, preFlightMode)

    if (mode === 'CONTAINMENT') {
      return NextResponse.json({
        error: 'This topic has been flagged for safety review. Please consult a qualified specialist directly for this clinical scenario.',
        gro_mode: 'CONTAINMENT',
        harm_score,
        triggered_terms,
      }, { status: 422 })
    }

    // Create HIR record before deducting credit — prevents lost credits on record creation failure
    const { data: hir, error: hirError } = await supabase
      .from('health_intelligence_reports')
      .insert({
        user_id: user.id,
        hir_type: params.report_type,
        query_input: params as unknown as Record<string, unknown>,
        gro_mode_at_generation: mode,
        atlas_sections: routeAtlasPrompts(params.domains_requested).split(','),
        status: 'pending',
      })
      .select('id')
      .single()

    if (hirError || !hir) throw new Error('Failed to create HIR record')

    // Deduct credit only after HIR record exists
    await supabase.rpc('deduct_credit', { p_user_id: user.id })

    // Execute HIR pipeline
    let downloadUrl: string
    try {
      const result = await generateHIR(hir.id, user.id, params, mode)
      downloadUrl = result.downloadUrl
    } catch (pipelineError) {
      // Refund credit if pipeline fails after deduction
      await supabase.rpc('refund_credit', { p_user_id: user.id, p_hir_id: hir.id })
      throw pipelineError
    }

    return NextResponse.json({
      hir_id: hir.id,
      status: 'complete',
      download_url: downloadUrl,
      gro_mode: mode,
    })
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.errors[0].message
      : (error as Error).message
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
