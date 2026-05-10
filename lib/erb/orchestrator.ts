import { createClient } from '@/lib/supabase/server'
import { callERBEngine } from './claude-client'
import { routeAtlasPrompts, buildATLASPrompt } from './atlas-router'
import { zposOptimize } from '@/lib/zpos/optimizer'
import { structureHIRContent } from './structurer'
import { l2RegexCheck } from '@/lib/npf/l2-filter'
import { injectDisclaimer } from '@/lib/npf/disclaimer'
import { generateAndStorePDF } from '@/lib/hir/pdf-generator'
import type { HIRRequest, GROMode, HIRContent } from '@/types'

export async function generateHIR(
  hirId: string,
  userId: string,
  params: HIRRequest,
  groMode: GROMode
): Promise<{ downloadUrl: string }> {
  const supabase = await createClient()

  // Update status to processing
  await supabase
    .from('health_intelligence_reports')
    .update({ status: 'processing' })
    .eq('id', hirId)

  try {
    // Step 1: Route ATLAS sections
    const sections = routeAtlasPrompts(params.domains_requested)

    // Step 2: Build user prompt
    const userPrompt = buildATLASPrompt(sections, params)

    // Step 3: Call ERB engine (Claude API)
    const rawOutput = await callERBEngine(userPrompt, groMode)

    // Step 4: ZPOS optimization
    const optimized = zposOptimize(rawOutput)

    // Step 5: Structure HIR content
    const content = structureHIRContent(optimized, params.domains_requested)

    // Step 6: L2 NPF regex check
    const { pass, flags } = l2RegexCheck(JSON.stringify(content))
    if (!pass) {
      const NPF_SAMPLE_LENGTH = 500
      await supabase.from('npf_violations').insert({
        user_id: userId,
        hir_id: hirId,
        patterns: flags,
        content_sample: JSON.stringify(content).substring(0, NPF_SAMPLE_LENGTH),
      })
      // Refund credit
      await supabase.rpc('refund_credit', { p_user_id: userId, p_hir_id: hirId })
      await supabase
        .from('health_intelligence_reports')
        .update({ status: 'failed', npf_filter_pass: false })
        .eq('id', hirId)
      throw new Error(`NPF violation detected: ${flags.join(', ')}`)
    }

    // Step 7: Inject disclaimer
    const { data: profile } = await supabase
      .from('profiles')
      .select('practitioner_type')
      .eq('id', userId)
      .single()

    content.disclaimer = injectDisclaimer(
      profile?.practitioner_type || 'Licensed Health Practitioner',
      new Date().toISOString().split('T')[0],
      params.report_type
    )

    // Step 8: Generate and store PDF
    const { pdfPath, downloadUrl } = await generateAndStorePDF(hirId, content)

    // Step 9: Update HIR record
    await supabase
      .from('health_intelligence_reports')
      .update({
        report_content: content as unknown as Record<string, unknown>,
        pdf_storage_path: pdfPath,
        atlas_sections: sections.split(','),
        evidence_grade: content.evidence_grade,
        npf_filter_pass: true,
        status: 'complete',
      })
      .eq('id', hirId)

    // Log credit usage
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -1,
      type: 'usage',
      hir_id: hirId,
    })

    return { downloadUrl }
  } catch (error) {
    await supabase
      .from('health_intelligence_reports')
      .update({ status: 'failed' })
      .eq('id', hirId)
    throw error
  }
}
