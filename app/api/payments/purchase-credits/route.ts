import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })

const CREDIT_BUNDLES: Record<string, { credits: number; amount: number; priceId: string }> = {
  bundle_20: { credits: 20, amount: 7900, priceId: process.env.STRIPE_CREDITS_20_PRICE_ID! },
  bundle_50: { credits: 50, amount: 17900, priceId: process.env.STRIPE_CREDITS_50_PRICE_ID! },
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bundle_id } = await req.json()
  const bundle = CREDIT_BUNDLES[bundle_id]
  if (!bundle) return NextResponse.json({ error: 'Invalid bundle' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: bundle.priceId, quantity: 1 }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?credits_purchased=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    metadata: { user_id: user.id, credits: bundle.credits.toString(), bundle_id },
  })

  return NextResponse.json({ url: session.url })
}
