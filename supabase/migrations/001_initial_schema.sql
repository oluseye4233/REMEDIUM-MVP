-- ============================================================
-- REMEDIUM SI — MVP Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- ── PROFILES (extends auth.users) ──────────────────────────
CREATE TABLE public.profiles (
  id                    UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  full_name             TEXT,
  subscriber_tier       TEXT DEFAULT 'personal'
                          CHECK (subscriber_tier IN ('personal', 'school', 'corporate')),
  cvs_status            TEXT DEFAULT 'pending_submission'
                          CHECK (cvs_status IN (
                            'pending_submission', 'under_review', 'verified',
                            'conditionally_verified', 'expired', 'rejected', 'suspended'
                          )),
  cvs_confidence_score  DECIMAL(5,2) DEFAULT 0,
  practitioner_type     TEXT,
  license_number        TEXT,
  credential_expiry     DATE,
  report_credits        INTEGER DEFAULT 0 CHECK (report_credits >= 0),
  gro_mode              TEXT DEFAULT 'LIFE' CHECK (gro_mode IN ('LIFE', 'SAFE_LIFE', 'CONTAINMENT')),
  stripe_customer_id    TEXT UNIQUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── CVS AUDIT LOG (immutable) ───────────────────────────────
CREATE TABLE public.cvs_audit_log (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type        TEXT NOT NULL,
  confidence_score  DECIMAL(5,2),
  decision_notes    TEXT,
  document_hashes   JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── HEALTH INTELLIGENCE REPORTS ─────────────────────────────
CREATE TABLE public.health_intelligence_reports (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  hir_type                 TEXT NOT NULL CHECK (hir_type IN (
                             'standard', 'integrative', 'pharmacognosy', 'nutritional', 'wellness'
                           )),
  query_input              JSONB NOT NULL,
  atlas_sections           TEXT[],
  gro_mode_at_generation   TEXT,
  evidence_grade           TEXT CHECK (evidence_grade IN ('A', 'B', 'C')),
  report_content           JSONB,
  pdf_storage_path         TEXT,
  cost_charged             DECIMAL(8,2) DEFAULT 1.00,
  download_count           INTEGER DEFAULT 0,
  npf_filter_pass          BOOLEAN DEFAULT TRUE,
  status                   TEXT DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_customer_id      TEXT,
  status                  TEXT DEFAULT 'inactive'
                            CHECK (status IN ('active', 'inactive', 'past_due', 'cancelled', 'trialing')),
  plan                    TEXT DEFAULT 'personal' CHECK (plan IN ('personal', 'school', 'corporate')),
  credits_included        INTEGER DEFAULT 10,
  credits_used            INTEGER DEFAULT 0,
  renewal_date            DATE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── CREDIT TRANSACTIONS ──────────────────────────────────────
CREATE TABLE public.credit_transactions (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount    INTEGER NOT NULL,
  type      TEXT NOT NULL CHECK (type IN ('purchase', 'subscription', 'usage', 'refund')),
  hir_id    UUID REFERENCES public.health_intelligence_reports(id),
  metadata  JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── NPF VIOLATIONS LOG ───────────────────────────────────────
CREATE TABLE public.npf_violations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  hir_id      UUID,
  patterns    TEXT[],
  content_sample TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_intelligence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npf_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users read own CVS log"
  ON public.cvs_audit_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own HIRs"
  ON public.health_intelligence_reports FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own credits"
  ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- ── TRIGGER: auto-create profile on user signup ──────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, practitioner_type, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'practitioner_type',
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── FUNCTION: atomic credit deduction ────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_credit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE v_remaining INTEGER;
BEGIN
  UPDATE public.profiles
  SET report_credits = report_credits - 1,
      updated_at = NOW()
  WHERE id = p_user_id AND report_credits > 0
  RETURNING report_credits INTO v_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  RETURN v_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── FUNCTION: atomic credit addition ─────────────────────────
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE v_total INTEGER;
BEGIN
  UPDATE public.profiles
  SET report_credits = report_credits + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING report_credits INTO v_total;
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── FUNCTION: refund credit ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.refund_credit(p_user_id UUID, p_hir_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET report_credits = report_credits + 1, updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, hir_id)
  VALUES (p_user_id, 1, 'refund', p_hir_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_hir_user_id ON public.health_intelligence_reports(user_id);
CREATE INDEX idx_hir_created_at ON public.health_intelligence_reports(created_at DESC);
CREATE INDEX idx_cvs_log_user_id ON public.cvs_audit_log(user_id);
CREATE INDEX idx_credit_tx_user_id ON public.credit_transactions(user_id);

-- ── STORAGE BUCKETS (run in Supabase Dashboard) ──────────────
-- Bucket: 'credentials' (private) — for CVS document uploads
-- Bucket: 'hir-reports'  (private) — for generated PDF reports
