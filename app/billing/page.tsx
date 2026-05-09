import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })

async function getInvoices(customerId: string) {
  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 10 })
    return invoices.data
  } catch { return [] }
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
  ])

  const invoices = profile?.stripe_customer_id ? await getInvoices(profile.stripe_customer_id) : []

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-primary-500 text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="font-bold text-lg">REMEDIUM SI</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary-100">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Credits</h1>

        {/* Current Plan */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold capitalize text-primary-600">
                {subscription?.plan || 'No Plan'} Tier
              </p>
              <p className="text-sm text-gray-500">
                Status:{' '}
                <span className={`font-medium ${subscription?.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                  {subscription?.status || 'Inactive'}
                </span>
              </p>
              {subscription?.renewal_date && (
                <p className="text-sm text-gray-400">Renews: {subscription.renewal_date}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-gray-900">{profile?.report_credits || 0}</p>
              <p className="text-xs text-gray-400">credits remaining</p>
            </div>
          </div>

          {profile?.stripe_customer_id && (
            <form action="/api/payments/billing-portal" method="post" className="mt-4">
              <button className="text-sm text-primary-600 hover:underline font-medium">
                Manage Subscription & Payment Methods →
              </button>
            </form>
          )}
        </div>

        {/* Subscribe */}
        {(!subscription || subscription.status !== 'active') && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">Subscribe</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border-2 border-primary-500 rounded-xl p-5">
                <p className="font-bold text-gray-900 mb-1">Personal Monthly</p>
                <p className="text-2xl font-black text-primary-500 mb-2">$29<span className="text-base font-normal text-gray-400">/mo</span></p>
                <p className="text-sm text-gray-600 mb-4">10 HIR credits per month</p>
                <form action="/api/payments/create-subscription" method="post">
                  <input type="hidden" name="plan" value="personal_monthly" />
                  <button className="w-full bg-primary-500 text-white font-semibold py-2 rounded-lg text-sm">Subscribe Monthly</button>
                </form>
              </div>
              <div className="border-2 border-gray-200 rounded-xl p-5 relative">
                <div className="absolute -top-3 left-4 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">SAVE 17%</div>
                <p className="font-bold text-gray-900 mb-1">Personal Annual</p>
                <p className="text-2xl font-black text-gray-900 mb-2">$290<span className="text-base font-normal text-gray-400">/yr</span></p>
                <p className="text-sm text-gray-600 mb-4">120 HIR credits (10/mo + 20 bonus)</p>
                <form action="/api/payments/create-subscription" method="post">
                  <input type="hidden" name="plan" value="personal_annual" />
                  <button className="w-full border border-primary-500 text-primary-600 font-semibold py-2 rounded-lg text-sm hover:bg-primary-50">Subscribe Annually</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Credit Bundles */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">Purchase Report Credits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'bundle_20', credits: 20, price: '$79', per: '$3.95/credit', saving: 'Save 21%' },
              { id: 'bundle_50', credits: 50, price: '$179', per: '$3.58/credit', saving: 'Save 28%' },
            ].map(b => (
              <div key={b.id} className="border border-gray-200 rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{b.credits} Credits</p>
                    <p className="text-xs text-gray-400">{b.per}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900">{b.price}</p>
                    <p className="text-xs text-green-600 font-medium">{b.saving}</p>
                  </div>
                </div>
                <form action="/api/payments/purchase-credits" method="post">
                  <input type="hidden" name="bundle_id" value={b.id} />
                  <button className="w-full bg-gray-900 text-white font-semibold py-2 rounded-lg text-sm hover:bg-gray-700">
                    Purchase {b.credits} Credits
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice History */}
        {invoices.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">Invoice History</h2>
            <div className="divide-y">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(inv.created * 1000).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">#{inv.number}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {inv.status}
                    </span>
                    <p className="text-sm font-bold">${((inv.amount_paid || 0) / 100).toFixed(2)}</p>
                    {inv.invoice_pdf && (
                      <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline">PDF</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
