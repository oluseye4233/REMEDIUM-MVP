import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { notify } from '@/lib/email/notify'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId) break

        if (session.mode === 'subscription') {
          // Subscription purchase
          const credits = 10
          await supabase.rpc('add_credits', { p_user_id: userId, p_amount: credits })
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_subscription_id: session.subscription as string,
            stripe_customer_id: session.customer as string,
            status: 'active',
            plan: 'personal',
            credits_included: credits,
            renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

          await supabase.from('credit_transactions').insert({
            user_id: userId, amount: credits, type: 'subscription',
          })

          const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
          if (profile) await notify.subscriptionConfirmed(profile.email, profile.full_name || 'Practitioner', 'Personal', credits)
        }

        if (session.mode === 'payment') {
          // Credit purchase
          const credits = parseInt(session.metadata?.credits || '0')
          if (credits > 0) {
            await supabase.rpc('add_credits', { p_user_id: userId, p_amount: credits })
            await supabase.from('credit_transactions').insert({
              user_id: userId, amount: credits, type: 'purchase',
              metadata: { bundle_id: session.metadata?.bundle_id, stripe_session: session.id },
            })
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single()
        if (!profile) break

        await supabase.rpc('add_credits', { p_user_id: profile.id, p_amount: 10 })
        await supabase.from('subscriptions').update({
          status: 'active',
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        }).eq('user_id', profile.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: profile } = await supabase.from('profiles').select('id, email, full_name').eq('stripe_customer_id', customerId).single()
        if (!profile) break

        await supabase.from('subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() }).eq('user_id', profile.id)
        await notify.paymentFailed(profile.email, profile.full_name || 'Practitioner')
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase.from('subscriptions').update({
          status: 'cancelled', updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id)
        break
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
