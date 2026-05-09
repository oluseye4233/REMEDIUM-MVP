// Supabase Edge Function: cvs-score
// Triggered after CVS document submission. Scores confidence. Transitions state.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CVSFields {
  name?: string
  license_number?: string
  expiry_date?: string
  issue_date?: string
  issuing_body?: string
  practitioner_type?: string
}

function calculateConfidenceScore(fields: CVSFields): number {
  let score = 0
  if (fields.license_number) score += 30
  if (fields.name) score += 20
  if (fields.expiry_date) score += 20
  if (fields.issuing_body) score += 20
  if (fields.issue_date) score += 10
  return score
}

function determineStatus(score: number): string {
  if (score >= 85) return 'verified'
  if (score >= 60) return 'conditionally_verified'
  return 'rejected'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, fields, hash, document_type } = await req.json() as {
      user_id: string
      fields: CVSFields
      hash: string
      document_type: string
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const score = calculateConfidenceScore(fields)
    const newStatus = determineStatus(score)

    // Update profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({
        cvs_status: newStatus,
        cvs_confidence_score: score,
        practitioner_type: fields.practitioner_type || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)
      .select('email, full_name, practitioner_type')
      .single()

    if (profileError) throw profileError

    // Log CVS event
    await supabase.from('cvs_audit_log').insert({
      user_id,
      event_type: newStatus.toUpperCase(),
      confidence_score: score,
      decision_notes: `Document type: ${document_type} | Fields detected: ${Object.keys(fields).filter(k => fields[k as keyof CVSFields]).join(', ')}`,
      document_hashes: { [document_type]: hash },
    })

    // Send email notification via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_API_KEY && profile?.email) {
      const emailContent = {
        verified: {
          subject: '✅ REMEDIUM SI — Your Credentials Are Verified!',
          text: `Hi ${profile.full_name || 'Practitioner'},\n\nYour credentials have been successfully verified. You can now generate Health Intelligence Reports.\n\nGet started: ${Deno.env.get('APP_URL') || 'https://remediumsi.health'}/hir/generate\n\nREMEDIUM SI Team`,
        },
        conditionally_verified: {
          subject: '🔄 REMEDIUM SI — Additional Review Required',
          text: `Hi ${profile.full_name || 'Practitioner'},\n\nYour credential submission is under additional manual review. We will update you within 48 hours.\n\nREMEDIUM SI Team`,
        },
        rejected: {
          subject: '❌ REMEDIUM SI — Verification Unsuccessful',
          text: `Hi ${profile.full_name || 'Practitioner'},\n\nUnfortunately your credential submission could not be verified. The following fields were not clearly detected: ${score < 60 ? Object.keys(fields).filter(k => !fields[k as keyof CVSFields]).join(', ') : 'confidence score insufficient'}.\n\nPlease re-submit with clearer documentation or contact support@remediumsi.health.\n\nREMEDIUM SI Team`,
        },
      }

      const template = emailContent[newStatus as keyof typeof emailContent]
      if (template) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'verify@remediumsi.health',
            to: profile.email,
            subject: template.subject,
            text: template.text,
          }),
        })
      }
    }

    return new Response(
      JSON.stringify({ status: newStatus, score }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
