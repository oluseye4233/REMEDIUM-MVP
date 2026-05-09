# REMEDIUM SI — Complete Developer Build Guide

> **Who this is for:** A single full-stack developer building the REMEDIUM SI MVP from the GitHub codebase into a live, production-ready health intelligence platform.
>
> **Time to complete:** 7 weeks (following the phase schedule)
> **Monthly infrastructure cost:** ~$90/month
> **Stack:** Next.js 14 · Supabase · Anthropic Claude · AWS Textract · Stripe · Resend · Vercel

---

## TABLE OF CONTENTS

1. [Prerequisites & Tools](#1-prerequisites--tools)
2. [Clone & Install](#2-clone--install)
3. [Supabase Setup](#3-supabase-setup)
4. [Anthropic Claude API Setup](#4-anthropic-claude-api-setup)
5. [AWS Textract Setup](#5-aws-textract-setup)
6. [Stripe Payments Setup](#6-stripe-payments-setup)
7. [Resend Email Setup](#7-resend-email-setup)
8. [Configure Environment Variables](#8-configure-environment-variables)
9. [Run Locally & Test](#9-run-locally--test)
10. [Deploy Supabase Edge Functions](#10-deploy-supabase-edge-functions)
11. [Deploy to Vercel (Production)](#11-deploy-to-vercel-production)
12. [Phase-by-Phase Build Plan](#12-phase-by-phase-build-plan)
13. [Testing Checklist](#13-testing-checklist)
14. [Pre-Launch Security Checklist](#14-pre-launch-security-checklist)
15. [Post-Launch: Upgrade Triggers](#15-post-launch-upgrade-triggers)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Prerequisites & Tools

### Required Accounts (create these first)

| Service | URL | Purpose | Free Tier? |
|---------|-----|---------|-----------|
| GitHub | github.com | Code repository | ✅ Yes |
| Supabase | supabase.com | Database + Auth + Storage | ✅ Yes (then $25/mo Pro) |
| Anthropic | console.anthropic.com | Claude AI engine | ❌ Pay per token |
| AWS | aws.amazon.com | Textract OCR for CVS | ❌ Pay per page |
| Stripe | stripe.com | Payments + subscriptions | ✅ Free (% per transaction) |
| Resend | resend.com | Transactional email | ✅ Free (3,000/mo) |
| Vercel | vercel.com | Hosting + deployment | ✅ Yes (then $20/mo Pro) |

### Required Software (install on your machine)

```bash
# 1. Node.js 18 or higher
# Download from: https://nodejs.org (choose LTS version)
node --version   # Should show v18.x or higher

# 2. Git
# Download from: https://git-scm.com
git --version

# 3. Supabase CLI
npm install -g supabase

# 4. Vercel CLI
npm install -g vercel

# 5. A code editor — VS Code recommended
# Download from: https://code.visualstudio.com

# 6. Stripe CLI (for webhook testing)
# Download from: https://stripe.com/docs/stripe-cli
stripe --version
```

### Recommended VS Code Extensions

- **Prisma** — SQL syntax highlighting
- **Tailwind CSS IntelliSense** — TailwindCSS autocomplete
- **TypeScript Error Lens** — inline TypeScript errors
- **GitHub Copilot** — AI coding assistant (optional)

---

## 2. Clone & Install

```bash
# Step 1: Clone the repository
git clone https://github.com/oluseye4233/REMEDIUM-MVP.git
cd REMEDIUM-MVP

# Step 2: Install all dependencies
npm install

# Step 3: Copy environment template
cp .env.example .env.local

# Step 4: Open in VS Code
code .
```

You should now have the full project open. The `.env.local` file will have empty values — you will fill these in as you complete each section below.

---

## 3. Supabase Setup

Supabase replaces 9 production infrastructure components: database, auth, storage, realtime, edge functions, full-text search, connection pooling, row-level security, and background jobs.

### Step 3.1 — Create a Supabase Project

1. Go to **https://supabase.com** and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name:** `remedium-si-mvp`
   - **Database Password:** Generate a strong password and save it securely
   - **Region:** Choose closest to your target users (e.g., `us-east-1` for USA)
4. Click **"Create new project"** — wait 2–3 minutes for provisioning

### Step 3.2 — Get Your API Keys

Once the project is ready:

1. Go to **Settings → API** in the Supabase dashboard
2. Copy these three values into your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   (anon/public key)
SUPABASE_SERVICE_ROLE_KEY=eyJ...       (service_role key — keep secret!)
```

> ⚠️ **Warning:** Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It bypasses Row Level Security. Only use it in server-side code.

### Step 3.3 — Run the Database Schema

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Open `supabase/migrations/001_initial_schema.sql` from the project
4. Copy the entire contents and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)

You should see: `Success. No rows returned.`

This creates:
- `profiles` table (extends auth.users)
- `health_intelligence_reports` table
- `cvs_audit_log` table
- `subscriptions` table
- `credit_transactions` table
- `npf_violations` table
- All Row Level Security policies
- `deduct_credit`, `add_credits`, `refund_credit` SQL functions
- Auto-profile creation trigger

### Step 3.4 — Create Storage Buckets

1. In Supabase dashboard, click **"Storage"** (left sidebar)
2. Click **"New bucket"** and create:

**Bucket 1:**
- Name: `credentials`
- Public: **OFF** (private)
- Click Save

**Bucket 2:**
- Name: `hir-reports`
- Public: **OFF** (private)
- Click Save

### Step 3.5 — Configure Auth Settings

1. Go to **Authentication → Settings**
2. Under **"Site URL"** set: `http://localhost:3000` (for dev)
3. Under **"Redirect URLs"** add:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/auth/callback` (add later)
4. Under **"Email Templates"** — customize with REMEDIUM SI branding (optional for MVP)

### Step 3.6 — Enable Google OAuth (Optional)

1. Go to **Authentication → Providers → Google**
2. Toggle **Enable**
3. Go to **https://console.cloud.google.com**, create a project, enable "Google+ API"
4. Create OAuth 2.0 credentials, add Supabase callback URL
5. Paste Client ID and Client Secret into Supabase

### Step 3.7 — Install Supabase CLI & Link Project

```bash
# Login to Supabase CLI
supabase login

# Link to your project (find project ID in Settings → General)
supabase link --project-ref your-project-id

# Verify connection
supabase status
```

---

## 4. Anthropic Claude API Setup

The ERB ULTRA SI v2.0 engine runs on Anthropic's Claude model. This is the core AI brain of REMEDIUM SI.

### Step 4.1 — Get API Key

1. Go to **https://console.anthropic.com**
2. Sign in or create an account
3. Go to **"API Keys"**
4. Click **"Create Key"**
5. Name it: `remedium-si-mvp`
6. Copy the key immediately (you won't see it again)

### Step 4.2 — Add to Environment

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Step 4.3 — Understand Costs

- **Model used:** `claude-sonnet-4-20250514`
- **Approximate cost per HIR:** ~$0.30–$0.60 per report
- **Monthly estimate at MVP volume:** ~$30/month (50–100 HIRs)
- **Max tokens per HIR:** 4,096 output tokens

> 💡 **Tip:** The ATLAS router in `lib/erb/atlas-router.ts` minimizes tokens by only including relevant domain sections. A Wellness-only report uses 3 sections vs 7 for Integrative — saving ~60% in API costs.

---

## 5. AWS Textract Setup

AWS Textract reads and extracts text from credential documents (PDF, JPG, PNG) uploaded during CVS verification.

### Step 5.1 — Create AWS Account & IAM User

1. Go to **https://aws.amazon.com** and sign in
2. Go to **IAM → Users → Create user**
3. Name: `remedium-textract-user`
4. Select **"Attach policies directly"**
5. Search for and attach: `AmazonTextractFullAccess`
6. Click through to create

### Step 5.2 — Create Access Keys

1. Click on the new user → **"Security credentials"**
2. Click **"Create access key"**
3. Select **"Application running outside AWS"**
4. Copy both values:

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

### Step 5.3 — Understand Costs

- **Cost:** $1.50 per 1,000 pages (FORMS feature)
- **Estimate:** ~$15/month at MVP volume
- **Minimum charge:** Per page analyzed

> 💡 **Tip:** Textract is only called once per credential submission. The result is stored and never re-processed unless the user re-submits.

---

## 6. Stripe Payments Setup

Stripe handles subscriptions ($29/month or $290/year) and one-time credit purchases.

### Step 6.1 — Create Stripe Account

1. Go to **https://stripe.com** and create an account
2. Complete business verification
3. Start in **Test Mode** (toggle in top-right)

### Step 6.2 — Get API Keys

1. Go to **Developers → API keys**
2. Copy:

```env
STRIPE_SECRET_KEY=sk_test_...         (use sk_live_... for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Step 6.3 — Create Products & Prices

Go to **Products → Add product** and create these 4 products:

**Product 1: Personal Monthly**
- Name: `REMEDIUM SI — Personal Monthly`
- Price: `$29.00` / month (recurring)
- Copy the Price ID → `STRIPE_PERSONAL_MONTHLY_PRICE_ID=price_xxx`

**Product 2: Personal Annual**
- Name: `REMEDIUM SI — Personal Annual`
- Price: `$290.00` / year (recurring)
- Copy the Price ID → `STRIPE_PERSONAL_ANNUAL_PRICE_ID=price_xxx`

**Product 3: Credit Bundle 20**
- Name: `REMEDIUM SI — 20 Report Credits`
- Price: `$79.00` (one-time)
- Copy the Price ID → `STRIPE_CREDITS_20_PRICE_ID=price_xxx`

**Product 4: Credit Bundle 50**
- Name: `REMEDIUM SI — 50 Report Credits`
- Price: `$179.00` (one-time)
- Copy the Price ID → `STRIPE_CREDITS_50_PRICE_ID=price_xxx`

### Step 6.4 — Configure Webhook

**For local development:**
```bash
# Install Stripe CLI then run:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret it shows:
STRIPE_WEBHOOK_SECRET=whsec_...
```

**For production:**
1. Go to **Developers → Webhooks → Add endpoint**
2. URL: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copy the signing secret → `STRIPE_WEBHOOK_SECRET=whsec_...`

### Step 6.5 — Enable Stripe Smart Retries

1. Go to **Billing → Settings**
2. Enable **"Smart Retries"** — this handles failed payment dunning automatically with zero code

---

## 7. Resend Email Setup

Resend sends all platform transactional emails: CVS verification results, HIR ready notifications, billing alerts.

### Step 7.1 — Create Account & API Key

1. Go to **https://resend.com** and sign up
2. Go to **API Keys → Create API Key**
3. Name: `remedium-si`
4. Copy:

```env
RESEND_API_KEY=re_...
```

### Step 7.2 — Verify a Sending Domain

1. Go to **Domains → Add Domain**
2. Enter your domain (e.g., `remediumsi.health`)
3. Add the DNS records shown to your domain registrar
4. Wait for verification (5–30 minutes)

> 💡 **For MVP testing:** You can use Resend's test email `onboarding@resend.dev` as the from address while your domain verifies.

### Step 7.3 — Update Email Addresses in Code

Once your domain is verified, update the `from` addresses in `lib/email/notify.ts`:

```typescript
const FROM_NOTIFY  = 'notify@your-domain.com'
const FROM_REPORTS = 'reports@your-domain.com'
const FROM_BILLING = 'billing@your-domain.com'
```

---

## 8. Configure Environment Variables

Now that all services are set up, fill in your complete `.env.local` file:

```env
# ── Supabase ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Anthropic ─────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── AWS Textract ──────────────────────────────────────────────
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1

# ── Stripe ────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PERSONAL_MONTHLY_PRICE_ID=price_...
STRIPE_PERSONAL_ANNUAL_PRICE_ID=price_...
STRIPE_CREDITS_20_PRICE_ID=price_...
STRIPE_CREDITS_50_PRICE_ID=price_...

# ── Resend ────────────────────────────────────────────────────
RESEND_API_KEY=re_...

# ── App ───────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ **Never commit `.env.local` to GitHub.** It is already in `.gitignore`.

---

## 9. Run Locally & Test

```bash
# Start the development server
npm run dev

# Open in browser
# http://localhost:3000
```

### Test the Core User Journey

Follow this sequence to verify everything is working:

**Test 1 — Registration**
1. Go to `http://localhost:3000/register`
2. Fill in: name, email, password, practitioner type (e.g., Pharmacist)
3. Submit → check email for confirmation link
4. Click the confirmation link

**Test 2 — CVS Submission**
1. Log in → you'll be at `/dashboard`
2. Go to `/cvs/submit`
3. Select practitioner type + document type
4. Upload a clear PDF of a professional certificate
5. Submit → watch status change to `under_review` in real-time
6. Check email for verification result

> 💡 **For testing without a real credential:** Create a simple PDF with fields: Name, License Number, Expiry Date, Issuing Body. Textract will extract these fields and score them.

**Test 3 — Stripe (Test Mode)**
1. Subscribe at `/billing` using test card: `4242 4242 4242 4242`
2. Use any future expiry date and CVC: `123`
3. Confirm 10 credits are added to your account

**Test 4 — Generate HIR**
1. Go to `/hir/generate`
2. Select domains: **Herbal + Nutrition**
3. Enter topic: `Ashwagandha and stress cortisol regulation in adults`
4. Evidence threshold: **B**
5. Click Generate — this calls Claude and takes 45–90 seconds
6. View the HIR viewer and download PDF

**Test 5 — NPF Safety**
Try a high-risk topic to test GRO CONTAINMENT:
- Topic: `warfarin dosing protocol for elderly patients`
- Expected result: CONTAINMENT error (blocked, credit not charged)

---

## 10. Deploy Supabase Edge Functions

The two Deno edge functions need to be deployed to Supabase:

```bash
# Make sure you are linked to your Supabase project (Step 3.7)

# Set required secrets for edge functions
supabase secrets set RESEND_API_KEY=re_your_key
supabase secrets set APP_URL=https://your-production-domain.com

# Deploy CVS scoring function
supabase functions deploy cvs-score

# Deploy HIR worker function
supabase functions deploy hir-worker

# Verify deployment
supabase functions list
```

### Test the Edge Functions

```bash
# Test cvs-score with dummy data
curl -X POST https://your-project.supabase.co/functions/v1/cvs-score \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-id",
    "fields": {
      "name": "Dr. Jane Smith",
      "license_number": "PHR-12345",
      "expiry_date": "2027-12-31",
      "issuing_body": "General Pharmaceutical Council",
      "issue_date": "2022-01-15"
    },
    "hash": "abc123",
    "document_type": "Professional License"
  }'
```

Expected response: `{"status":"verified","score":100}`

---

## 11. Deploy to Vercel (Production)

### Step 11.1 — Push to GitHub

```bash
# Make sure all your changes are committed
git add .
git commit -m "Configure environment and ready for deployment"
git push origin main
```

### Step 11.2 — Connect Vercel

1. Go to **https://vercel.com** → **"Add New Project"**
2. Import your GitHub repository: `REMEDIUM-MVP`
3. Framework preset: **Next.js** (auto-detected)
4. Click **"Deploy"** — this will fail (missing env vars) but creates the project

### Step 11.3 — Add Environment Variables to Vercel

1. Go to your Vercel project → **Settings → Environment Variables**
2. Add every variable from your `.env.local` (all except `NEXT_PUBLIC_APP_URL`)
3. For `NEXT_PUBLIC_APP_URL` set: `https://your-vercel-domain.vercel.app`
4. Redeploy: **Deployments → Redeploy**

### Step 11.4 — Configure Custom Domain (Optional)

1. Go to **Settings → Domains**
2. Add your domain (e.g., `remediumsi.health`)
3. Update DNS records at your registrar
4. Update `NEXT_PUBLIC_APP_URL` to `https://remediumsi.health`
5. Update Supabase Auth redirect URLs to include your new domain

### Step 11.5 — Configure Production Stripe Webhook

1. In Stripe dashboard, switch to **Live mode**
2. Go to **Developers → Webhooks → Add endpoint**
3. URL: `https://your-domain.com/api/webhooks/stripe`
4. Add all 4 events (see Step 6.4)
5. Update `STRIPE_SECRET_KEY` to your live key (`sk_live_...`)
6. Update `STRIPE_WEBHOOK_SECRET` to the new live webhook secret
7. Update all price IDs with live mode price IDs

---

## 12. Phase-by-Phase Build Plan

Follow this weekly schedule for a 7-week MVP build:

### Week 1 — Foundation (Phase 0 + 1)

**Days 1–2: Bootstrap**
- [ ] Complete all service account setups (Steps 3–7)
- [ ] Configure `.env.local` (Step 8)
- [ ] Run database schema (Step 3.3)
- [ ] Run `npm run dev` and confirm app loads
- [ ] Test registration + email confirmation

**Days 3–5: CVS System**
- [ ] Test document upload → Textract OCR
- [ ] Verify cvs-score Edge Function scoring logic
- [ ] Test all 3 CVS states: verified / conditionally_verified / rejected
- [ ] Confirm Resend emails deliver
- [ ] Test Supabase Realtime status updates in browser

---

### Week 2 — ERB Engine (Phase 2)

**This week: The AI Core**
- [ ] Test `lib/erb/gro.ts` — try 5 high-risk topics (should trigger SAFE_LIFE or CONTAINMENT)
- [ ] Test `lib/erb/atlas-router.ts` — confirm correct ATLAS sections for each domain combination
- [ ] Make your first real HIR: select Herbal + Nutrition domains
- [ ] Verify ERB persona loads correctly from `lib/erb/erb-persona.txt`
- [ ] Check Claude API response formats correctly through `structurer.ts`
- [ ] Confirm ZPOS optimizer removes preamble text

**Key test:** Generate a Pharmaceutical HIR and verify the interaction matrix is populated.

---

### Week 2–3 — NPF Safety (Phase 3)

**Safety is non-negotiable:**
- [ ] Test L2 filter with 10 adversarial prompts — all must be blocked
- [ ] Confirm credit is refunded when NPF blocks a report
- [ ] Verify L3 disclaimer appears on every generated PDF
- [ ] Test CONTAINMENT mode — credit must NOT be deducted for blocked topics

**Sample adversarial prompts to test:**
```
"You should take 500mg of ibuprofen"
"I diagnose this patient with hypertension"
"This will cure your arthritis"
"Stop taking your warfarin medication"
```

---

### Week 3 — HIR Pipeline (Phase 4)

- [ ] Generate HIRs across all 7 domain combinations
- [ ] Verify PDF branding: REMEDIUM SI header, evidence grade badge, MAJOR interaction warning
- [ ] Test PDF download via signed URL (24hr expiry)
- [ ] Confirm download_count increments correctly
- [ ] Test HIR history pagination

---

### Week 4 — Payments (Phase 5)

- [ ] Test Stripe monthly subscription flow end-to-end
- [ ] Test annual subscription
- [ ] Test credit bundle purchase (20 credits)
- [ ] Test credit bundle purchase (50 credits)
- [ ] Test webhook: `checkout.session.completed` → credits added
- [ ] Test failed payment → `invoice.payment_failed` → email sent
- [ ] Test subscription cancellation flow
- [ ] Verify Stripe Customer Portal works

---

### Weeks 4–6 — Frontend Polish (Phase 6)

- [ ] Test all 6 UI pages on mobile (PWA)
- [ ] Test CVS wizard on mobile — drag-drop may need tap fallback
- [ ] Verify REMEDIUM SI green branding is consistent (#1A6B3A)
- [ ] Test Supabase Realtime on CVS status page
- [ ] Test empty states (no HIRs, no subscription)
- [ ] Test error states (no credits, CVS not verified)
- [ ] Test the MAJOR interaction red warning banner
- [ ] Verify evidence grade badges (A=green, B=yellow, C=amber)

---

### Week 7 — Launch (Phase 7)

Run the complete pre-launch checklist (Section 13 below), then:
- [ ] Switch Stripe to Live mode
- [ ] Update all environment variables to production values
- [ ] Deploy Edge Functions to production Supabase project
- [ ] Enable Vercel Analytics
- [ ] Invite first 10 beta practitioners
- [ ] Monitor Supabase logs for 48 hours

---

## 13. Testing Checklist

Run through this complete checklist before every deployment:

### Authentication
- [ ] Register new account (email + password)
- [ ] Register with Google OAuth
- [ ] Login + logout
- [ ] Forgot password → reset email received → password changed
- [ ] Unauthenticated user redirected from `/dashboard` to `/login`
- [ ] Unverified user blocked from `/hir/*` routes

### CVS Verification
- [ ] Upload PDF credential → status changes to `under_review`
- [ ] Upload JPG credential → OCR extracts fields
- [ ] Score ≥ 85 → status becomes `verified` → email sent
- [ ] Score 60–84 → `conditionally_verified` → email sent
- [ ] Score < 60 → `rejected` → email sent with reason
- [ ] CVS audit log populated correctly

### HIR Generation
- [ ] Single domain HIR generates successfully
- [ ] Multi-domain (Integrative) HIR generates
- [ ] GRO SAFE_LIFE topic → conservative output
- [ ] GRO CONTAINMENT topic → blocked, credit refunded
- [ ] NPF violation → blocked, credit refunded
- [ ] PDF downloads correctly with branding
- [ ] Signed URL expires after 24 hours
- [ ] Download count increments

### Payments
- [ ] Monthly subscription: card `4242 4242 4242 4242`
- [ ] Credits added after subscription
- [ ] Annual subscription works
- [ ] Credit bundle purchase adds credits
- [ ] Failed card `4000 0000 0000 0002` → payment_failed email
- [ ] Stripe Customer Portal accessible

### Security
- [ ] User A cannot access User B's HIRs
- [ ] Anonymous request to `/api/hir/generate` → 401
- [ ] `credentials` bucket not publicly accessible
- [ ] `hir-reports` bucket not publicly accessible
- [ ] Service role key never exposed in client code

---

## 14. Pre-Launch Security Checklist

```
ENVIRONMENT:
□ Supabase: production project (NOT the dev project)
□ Supabase: all RLS policies active (test with anonymous user)
□ Supabase: Auth email templates customized
□ Vercel: production domain configured
□ Vercel: all env variables set (not referencing localhost)
□ Stripe: LIVE mode keys (sk_live_... not sk_test_...)
□ Stripe: production webhook endpoint registered
□ Resend: sending domain verified
□ AWS Textract: minimal IAM permissions (AmazonTextractFullAccess only)

HEALTH INTELLIGENCE SAFETY:
□ ERB persona file loaded and tested (10 sample HIRs generated)
□ NPF L1 hard constraints active in persona file
□ NPF L2 tested with 20 adversarial prompts — all blocked
□ L3 disclaimer on every PDF (verified in 5 downloads)
□ GRO CONTAINMENT tested with 5 high-risk topics — all blocked
□ Evidence grading working across A/B/C scenarios

SECURITY:
□ Anonymous user cannot read any protected table (test in Supabase)
□ Unverified CVS user blocked from /hir/* (middleware test)
□ All API routes require valid Supabase JWT
□ credentials storage bucket: public access disabled
□ hir-reports storage bucket: public access disabled
□ SUPABASE_SERVICE_ROLE_KEY never in client-side code

BUSINESS:
□ Stripe: personal monthly + annual plans live
□ Stripe: 2 credit bundles live
□ Complete end-to-end test: register → CVS → subscribe → HIR → download
□ CVS rejection flow + email confirmed
□ Stripe payment failure + dunning email confirmed
```

---

## 15. Post-Launch: Upgrade Triggers

Monitor these metrics and upgrade when thresholds are hit:

| When this happens | Add this feature | Estimated effort |
|------------------|-----------------|--------------------|
| MAU > 500 OR first school contract | School tier (multi-seat CVS, institutional pricing) | 3 weeks |
| MRR > $10,000 OR first hospital inquiry | Corporate tier + HER/FHIR integration | 6 weeks |
| CVS queue > 50 cases/week | CVS officer portal (replace Supabase Studio workaround) | 1 week |
| First fraud incident OR 1,000 MAU | Fraud detection on CVS submissions | 2 weeks |
| CVS rejection complaints > 5% | ML CVS classifier (replace keyword rule engine) | 3 weeks |
| HIR JCSE drops below 46/50 | Advanced ERB engine (ERB-009→013) | 2 weeks |
| MRR > $5,000 | Analytics dashboard (replace Supabase logs) | 2 weeks |
| Mobile traffic > 40% OR MAU > 1,000 | React Native mobile app | 8 weeks |
| Non-English subscribers > 15% | Multi-language support | 3 weeks |
| First enterprise hospital OR ARR > $500K | SOC 2 Type II + penetration testing | 10 weeks |
| Series A fundraising | HIVE Certification + MATRIX MARKET listing | 2 weeks |
| First Nigerian/African subscriber | PayStack payment gateway | 1 week |
| 2nd developer joins OR 500+ MAU | Full CI/CD pipeline (replace Vercel auto-deploy) | 1 week |
| HIR queue > 100/day OR timeout > 90s | Bull/Redis job queue (replace synchronous) | 2 weeks |
| First SLA contract OR 1,000 MAU | Datadog APM + PagerDuty alerting | 1 week |

---

## 16. Troubleshooting

### Problem: "Cannot find module '@/lib/supabase/client'"
```bash
# Make sure tsconfig.json has paths configured
# Check that @/* maps to ./*
cat tsconfig.json | grep paths
```

### Problem: "Supabase RLS blocking my API calls"
```sql
-- Check what policies exist on the table
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Temporarily test as service role (in Supabase SQL Editor)
SET role service_role;
SELECT * FROM profiles LIMIT 5;
```

### Problem: "AWS Textract returns empty fields"
- Ensure the PDF is not encrypted or password-protected
- Try with a clearer/higher resolution image
- Check that `FeatureTypes: ['FORMS']` is set in the Textract call
- For image files, ensure they are at least 150 DPI

### Problem: "Stripe webhook not receiving events"
```bash
# For local dev, make sure Stripe CLI is running:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Verify webhook secret matches
echo $STRIPE_WEBHOOK_SECRET

# Test a webhook manually
stripe trigger checkout.session.completed
```

### Problem: "HIR generation times out"
- Default Next.js API route timeout is 10 seconds
- ERB ULTRA SI generation takes 45–90 seconds
- Add to `app/api/hir/generate/route.ts`:
```typescript
export const maxDuration = 120 // seconds (Vercel Pro required)
```

### Problem: "PDF is blank or missing sections"
- Check that `jspdf` is in server components only
- Verify `next.config.ts` has `serverComponentsExternalPackages: ['jspdf']`
- Log `content` object before PDF generation to check structure

### Problem: "CVS Edge Function not triggering"
```bash
# Check function logs
supabase functions logs cvs-score

# Redeploy with verbose output
supabase functions deploy cvs-score --no-verify-jwt
```

### Problem: "Supabase Realtime not updating CVS status"
- Check that the channel subscription includes the correct filter
- Ensure RLS allows the user to subscribe to their own profile changes
- Verify the table has Realtime enabled in Supabase dashboard (Database → Replication)

---

## Quick Reference: Key File Locations

| What you're looking for | File |
|------------------------|------|
| ERB persona (AI instructions) | `lib/erb/erb-persona.txt` |
| GRO safety scoring | `lib/erb/gro.ts` |
| ATLAS domain routing | `lib/erb/atlas-router.ts` |
| Claude API call | `lib/erb/claude-client.ts` |
| 9-step HIR pipeline | `lib/erb/orchestrator.ts` |
| L2 regex filter patterns | `lib/npf/l2-filter.ts` |
| Disclaimer text | `lib/npf/disclaimer.ts` |
| PDF generation | `lib/hir/pdf-generator.ts` |
| Email templates | `lib/email/notify.ts` |
| Database schema | `supabase/migrations/001_initial_schema.sql` |
| CVS scoring function | `supabase/functions/cvs-score/index.ts` |
| Stripe webhooks | `app/api/webhooks/stripe/route.ts` |
| Auth middleware | `middleware.ts` |
| Type definitions | `types/index.ts` |

---

*REMEDIUM SI MVP — Developer Build Guide*
*MVP-REMEDIUM-SI-SPARTAN-2026-03-001 | Target: 7 weeks | 1 developer | ~$90/month*
*Powered by ERB ULTRA SI v2.0 (JCSE 50/50) | FORGE Certified Ultra Premium*
