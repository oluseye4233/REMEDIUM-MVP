import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('cvs_status, cvs_confidence_score, practitioner_type, credential_expiry')
    .eq('id', user.id)
    .single()

  const { data: auditLog } = await supabase
    .from('cvs_audit_log')
    .select('event_type, confidence_score, decision_notes, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    cvs_status: profile?.cvs_status,
    confidence_score: profile?.cvs_confidence_score,
    practitioner_type: profile?.practitioner_type,
    credential_expiry: profile?.credential_expiry,
    audit_log: auditLog || [],
  })
}
