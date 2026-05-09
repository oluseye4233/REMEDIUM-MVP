'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const STATUS_CONFIG = {
  pending_submission: { icon: '📋', color: 'gray', label: 'Pending Submission', desc: 'Submit your professional credential to begin verification.' },
  under_review: { icon: '🔄', color: 'blue', label: 'Under Review', desc: 'Your credential is being processed. This typically takes up to 2 hours.' },
  verified: { icon: '✅', color: 'green', label: 'Verified', desc: 'Your credentials have been verified. You can now generate Health Intelligence Reports.' },
  conditionally_verified: { icon: '🔁', color: 'yellow', label: 'Additional Review Required', desc: 'Your application requires manual review. We will update you within 48 hours.' },
  rejected: { icon: '❌', color: 'red', label: 'Verification Unsuccessful', desc: 'Your credential could not be verified. Please re-submit with clearer documentation.' },
  expired: { icon: '⏰', color: 'orange', label: 'Expired', desc: 'Your credential has expired. Please submit updated documentation.' },
  suspended: { icon: '🚫', color: 'red', label: 'Suspended', desc: 'Your account has been suspended. Contact support@remediumsi.health.' },
} as const

type CVSStatus = keyof typeof STATUS_CONFIG

export default function CVSStatusPage() {
  const [status, setStatus] = useState<CVSStatus>('pending_submission')
  const [score, setScore] = useState<number | null>(null)
  const [auditLog, setAuditLog] = useState<Array<{event_type: string; created_at: string}>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await fetch('/api/cvs/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data.cvs_status || 'pending_submission')
        setScore(data.confidence_score)
        setAuditLog(data.audit_log || [])
      }
      setLoading(false)
    }
    fetchStatus()

    // Supabase Realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel('cvs-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new?.cvs_status) {
          setStatus(payload.new.cvs_status as CVSStatus)
          setScore(payload.new.cvs_confidence_score)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending_submission

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">{cfg.icon}</div>
          <h1 className="text-2xl font-bold mb-2">{cfg.label}</h1>
          <p className="text-gray-600 mb-6">{cfg.desc}</p>

          {score !== null && status !== 'pending_submission' && (
            <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mb-6">
              <span className="text-sm text-gray-500">Confidence Score:</span>
              <span className="font-bold text-primary-600">{score}%</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {status === 'verified' && (
              <Link href="/hir/generate" className="bg-primary-500 text-white font-semibold py-3 rounded-lg hover:bg-primary-600">
                Generate Your First HIR →
              </Link>
            )}
            {(status === 'pending_submission' || status === 'rejected' || status === 'expired') && (
              <Link href="/cvs/submit" className="bg-primary-500 text-white font-semibold py-3 rounded-lg hover:bg-primary-600">
                {status === 'pending_submission' ? 'Submit Credentials' : 'Re-Submit Credentials'}
              </Link>
            )}
            <Link href="/dashboard" className="border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50">
              Back to Dashboard
            </Link>
          </div>
        </div>

        {auditLog.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Verification History</h3>
            <div className="space-y-2">
              {auditLog.map((entry, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{entry.event_type.replace(/_/g, ' ')}</span>
                  <span className="text-gray-400">{new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
