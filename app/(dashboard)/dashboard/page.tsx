import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'

const CVS_BADGE = {
  verified: 'bg-green-100 text-green-700',
  pending_submission: 'bg-gray-100 text-gray-600',
  under_review: 'bg-blue-100 text-blue-700',
  conditionally_verified: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
  suspended: 'bg-red-100 text-red-700',
} as const

const GRADE_COLORS: Record<string, string> = { A: 'text-green-600', B: 'text-yellow-600', C: 'text-orange-500' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: reports }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('health_intelligence_reports')
      .select('id, hir_type, evidence_grade, atlas_sections, download_count, status, created_at, query_input')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
  ])

  if (!profile) redirect('/login')

  const cvsStatus = profile.cvs_status as keyof typeof CVS_BADGE

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-primary-500 text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="font-bold text-lg">REMEDIUM SI</span>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/hir/generate" className="hover:text-primary-100">Generate HIR</Link>
            <Link href="/billing" className="hover:text-primary-100">Billing</Link>
            <form action="/api/auth/signout" method="post">
              <button className="hover:text-primary-100">Sign Out</button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Welcome, {profile.practitioner_type || 'Practitioner'}
        </h1>
        <p className="text-gray-500 text-sm mb-8">{profile.email}</p>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">CVS Status</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${CVS_BADGE[cvsStatus] || 'bg-gray-100 text-gray-600'}`}>
              {cvsStatus?.replace(/_/g, ' ').toUpperCase()}
            </span>
            {cvsStatus !== 'verified' && (
              <div className="mt-3">
                <Link href="/cvs/submit" className="text-xs text-primary-600 font-medium hover:underline">
                  {cvsStatus === 'pending_submission' ? 'Submit credentials →' : 'View status →'}
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Report Credits</p>
            <p className="text-3xl font-black text-primary-500">{profile.report_credits}</p>
            {profile.report_credits < 3 && (
              <Link href="/billing" className="text-xs text-orange-600 font-medium hover:underline block mt-2">
                ⚠️ Running low — Top up →
              </Link>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Subscription</p>
            <p className="font-semibold text-gray-900 capitalize">{subscription?.plan || 'No Plan'}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {subscription?.status === 'active'
                ? `Renews ${subscription.renewal_date ? formatDate(subscription.renewal_date) : 'N/A'}`
                : 'Inactive'}
            </p>
            {!subscription || subscription.status !== 'active' ? (
              <Link href="/billing" className="text-xs text-primary-600 font-medium hover:underline block mt-2">
                Subscribe →
              </Link>
            ) : null}
          </div>
        </div>

        {/* Quick Generate */}
        {cvsStatus === 'verified' && profile.report_credits > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 mb-8 flex items-center justify-between">
            <div>
              <p className="font-semibold text-primary-800">Ready to generate intelligence</p>
              <p className="text-sm text-primary-600">You have {profile.report_credits} credit{profile.report_credits !== 1 ? 's' : ''} available</p>
            </div>
            <Link href="/hir/generate" className="bg-primary-500 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-600 text-sm">
              Generate HIR →
            </Link>
          </div>
        )}

        {/* Recent HIRs */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="font-bold text-gray-900">Recent Reports</h2>
            <span className="text-xs text-gray-400">{reports?.length || 0} total</span>
          </div>

          {!reports?.length ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm">No reports yet.</p>
              {cvsStatus === 'verified' && (
                <Link href="/hir/generate" className="text-primary-600 text-sm font-medium hover:underline block mt-2">
                  Generate your first HIR →
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {reports.map(r => (
                <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                  <div className={`text-2xl font-black w-10 text-center ${GRADE_COLORS[r.evidence_grade || 'C']}`}>
                    {r.evidence_grade || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate capitalize">
                      {r.hir_type} HIR
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.atlas_sections?.join(', ')} · {formatDate(r.created_at)} · {r.download_count} download{r.download_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${r.status === 'complete' ? 'bg-green-100 text-green-700' : r.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {r.status}
                    </span>
                    {r.status === 'complete' && (
                      <Link href={`/hir/${r.id}`} className="text-xs text-primary-600 font-medium hover:underline">
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
