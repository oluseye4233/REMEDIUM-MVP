// Supabase Edge Function: hir-worker
// Async HIR generation worker — called for background/retry processing.
// At MVP: synchronous. Add Bull queue when HIR volume > 100/day.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { hir_id, user_id } = await req.json() as { hir_id: string; user_id: string }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check HIR exists and is in pending/processing state
    const { data: hir } = await supabase
      .from('health_intelligence_reports')
      .select('*')
      .eq('id', hir_id)
      .eq('user_id', user_id)
      .single()

    if (!hir || hir.status === 'complete') {
      return new Response(
        JSON.stringify({ message: 'HIR already complete or not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Trigger re-processing via the main API
    const appUrl = Deno.env.get('APP_URL') || 'https://remediumsi.health'
    const response = await fetch(`${appUrl}/api/hir/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-service-key': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '' },
      body: JSON.stringify({ hir_id, user_id }),
    })

    const result = await response.json()

    // Notify user when complete
    if (result.status === 'complete') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user_id)
        .single()

      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
      if (RESEND_API_KEY && profile?.email && result.download_url) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'reports@remediumsi.health',
            to: profile.email,
            subject: '📄 Your Health Intelligence Report is Ready',
            text: `Your Health Intelligence Report has been generated.\n\nDownload link (expires in 24 hours):\n${result.download_url}\n\nView all your reports: ${appUrl}/dashboard\n\nREMEDIUM SI Team`,
          }),
        })
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
