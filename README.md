# REMEDIUM SI — MVP

**Health Intelligence Platform for Licensed Practitioners**

> Powered by ERB ULTRA SI v2.0 · JCSE 50/50 · FORGE Certified Ultra Premium

---

## Overview

REMEDIUM SI generates evidence-based Health Intelligence Reports (HIRs) for verified licensed health practitioners across 7 integrated domains:

- 💊 **Pharmaceutical** — Drug interactions & pharmacokinetics
- 🌿 **Herbal** — Botanical medicine & plant therapeutics
- 🧬 **Pharmacognosy** — Natural product science
- 🥗 **Nutrition** — Nutritional protocols & micronutrients
- 🏃 **Fitness** — Exercise physiology & lifestyle medicine
- 🧘 **Wellness** — Integrative wellness & prevention
- 🔗 **Integrative** — All 7 domains combined

## SPARTAN MVP Metrics

| Metric | Value |
|--------|-------|
| Prompts compressed | 168 → 30 (82.1%) |
| Stack depth | 12 layers → 4 (66.7%) |
| Timeline | 40 weeks → 7 weeks (82.5%) |
| Infrastructure cost | ~$8,500/month → ~$90/month (98.9%) |
| Team size | 12 developers → 1 developer |
| Feature fidelity | 100% (FFS = 100%) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 App Router + TypeScript + TailwindCSS + shadcn/ui |
| Backend | Next.js API Routes (Edge Runtime) |
| Database | Supabase PostgreSQL (managed) |
| Auth | Supabase Auth SDK |
| Storage | Supabase Storage |
| AI Engine | Anthropic Claude API (claude-sonnet-4-20250514) |
| OCR | AWS Textract (credential parsing) |
| Payments | Stripe (subscriptions + credit bundles) |
| Email | Resend |
| Deployment | Vercel |
| Edge Functions | Supabase Edge Functions (Deno) |

## Monthly Infrastructure Cost

| Service | Cost |
|---------|------|
| Supabase Pro | $25/month |
| Vercel Pro | $20/month |
| AWS Textract | ~$15/month |
| Anthropic API | ~$30/month |
| Stripe | 0 (% per transaction) |
| Resend | $0 (free tier) |
| **TOTAL** | **~$90/month** |

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Anthropic API key
- AWS account (Textract)
- Stripe account
- Resend account

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/REMEDIUM-MVP.git
cd REMEDIUM-MVP
npm install

# Configure environment
cp .env.example .env.local
# Fill in all values in .env.local

# Set up database
# Run supabase/migrations/001_initial_schema.sql in Supabase SQL Editor

# Create Supabase storage buckets
# - credentials (private)
# - hir-reports (private)

# Deploy Edge Functions
supabase functions deploy cvs-score
supabase functions deploy hir-worker

# Start development server
npm run dev
```

## Architecture

```
remedium-mvp/
├── app/
│   ├── (auth)/          # Login, Register, Forgot Password
│   ├── (dashboard)/     # Protected dashboard
│   ├── cvs/             # Credential submission & status
│   ├── hir/             # HIR generation & viewer
│   ├── billing/         # Subscription & credit management
│   └── api/             # All API routes
├── lib/
│   ├── supabase/        # Client, Server, Middleware
│   ├── erb/             # ERB ULTRA SI Engine
│   │   ├── persona.ts   # ERB ULTRA SI v2.0 system prompt loader
│   │   ├── atlas-router.ts  # ATLAS section routing
│   │   ├── gro.ts       # GRO pre-flight safety check
│   │   ├── claude-client.ts # Anthropic API client
│   │   ├── structurer.ts    # HIR content structurer
│   │   ├── interactions.ts  # Interaction matrix extractor
│   │   └── orchestrator.ts  # 9-step HIR pipeline
│   ├── npf/             # Non-Prescriptive Filter
│   │   ├── l2-filter.ts # L2 regex safety check
│   │   └── disclaimer.ts    # L3 mandatory disclaimer
│   ├── hir/             # HIR PDF generator
│   ├── zpos/            # ZPOS token optimizer
│   └── email/           # Resend notification service
├── supabase/
│   ├── migrations/      # Database schema
│   └── functions/       # Deno Edge Functions
└── types/               # TypeScript type definitions
```

## Safety Architecture

REMEDIUM SI implements a 3-layer Non-Prescriptive Filter (NPF):

| Layer | Implementation | Purpose |
|-------|---------------|---------|
| **L1** | ERB persona hard constraints | Never prescribe, never diagnose |
| **L2** | Regex pattern matching | Block prohibited prescriptive language |
| **L3** | Mandatory disclaimer injection | Legal non-prescriptive notice on every HIR |

**GRO Safety Modes:**
- `LIFE` — Standard operation
- `SAFE_LIFE` — Conservative mode for elevated-risk topics
- `CONTAINMENT` — Safety advisory only for high-risk topics (blocked from full HIR)

## Pricing

| Plan | Price | Credits |
|------|-------|---------|
| Personal Monthly | $29/month | 10 HIR credits |
| Personal Annual | $290/year | 120 credits (10/mo + 20 bonus) |
| Credit Bundle 20 | $79 one-time | 20 credits |
| Credit Bundle 50 | $179 one-time | 50 credits |

## Upgrade Triggers (CLASS C → Production)

| Feature | Trigger |
|---------|---------|
| School Tier | MAU > 500 OR first school contract |
| Corporate Tier | MRR > $10,000 OR first hospital inquiry |
| Mobile App | MAU > 1,000 OR mobile traffic > 40% |
| ML CVS Classifier | CVS rejection rate > 5% |
| Analytics Service | MRR > $5,000 |
| SOC 2 Certification | First enterprise contract OR ARR > $500K |
| PayStack | First Nigerian/African subscriber |
| Bull Queue | HIR volume > 100/day |

---

*MVP-REMEDIUM-SI-SPARTAN-2026-03-001 | JCSE: 49/50 | GRO: SAFE_LIFE*

*⚔️ SPARTAN: 7 weeks. 1 developer. $90/month. 100% feature fidelity.*
