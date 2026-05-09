// ============================================================
// REMEDIUM SI — Core Type Definitions
// ============================================================

export type SubscriberTier = 'personal' | 'school' | 'corporate'
export type CVSStatus =
  | 'pending_submission'
  | 'under_review'
  | 'verified'
  | 'conditionally_verified'
  | 'expired'
  | 'rejected'
  | 'suspended'
export type GROMode = 'LIFE' | 'SAFE_LIFE' | 'CONTAINMENT'
export type EvidenceGrade = 'A' | 'B' | 'C'
export type HIRType = 'standard' | 'integrative' | 'pharmacognosy' | 'nutritional' | 'wellness'
export type HIRStatus = 'pending' | 'processing' | 'complete' | 'failed'
export type ATLASSection = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type HealthDomain =
  | 'Pharmacy'
  | 'Herbal'
  | 'Nutrition'
  | 'Fitness'
  | 'Wellness'
  | 'Pharmacognosy'
  | 'Integrative'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  subscriber_tier: SubscriberTier
  cvs_status: CVSStatus
  cvs_confidence_score: number
  practitioner_type: string | null
  license_number: string | null
  credential_expiry: string | null
  report_credits: number
  gro_mode: GROMode
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  status: 'active' | 'inactive' | 'past_due' | 'cancelled' | 'trialing'
  plan: SubscriberTier
  credits_included: number
  credits_used: number
  renewal_date: string | null
  created_at: string
  updated_at: string
}

export interface HIRContent {
  executive_summary: string
  evidence_hierarchy: string
  domain_protocols: { domain: string; content: string }[]
  interaction_matrix: InteractionEntry[]
  quality_standards: string
  monitoring_framework: string
  cultural_considerations: string
  citations: string[]
  evidence_grade: EvidenceGrade
  disclaimer: string
}

export interface InteractionEntry {
  compound_a: string
  compound_b: string
  type: 'MAJOR' | 'MODERATE' | 'MINOR'
  mechanism: string
  clinical_significance: string
  evidence_grade: EvidenceGrade
  recommendation: string
}

export interface HIRRequest {
  report_type: HIRType
  health_topic: string
  domains_requested: HealthDomain[]
  evidence_threshold: EvidenceGrade
}

export interface HealthIntelligenceReport {
  id: string
  user_id: string
  hir_type: HIRType
  query_input: HIRRequest
  atlas_sections: string[]
  gro_mode_at_generation: GROMode | null
  evidence_grade: EvidenceGrade | null
  report_content: HIRContent | null
  pdf_storage_path: string | null
  cost_charged: number
  download_count: number
  npf_filter_pass: boolean
  status: HIRStatus
  created_at: string
}

export interface CVSAuditEntry {
  id: string
  user_id: string
  event_type: string
  confidence_score: number | null
  decision_notes: string | null
  document_hashes: Record<string, string> | null
  created_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  type: 'purchase' | 'subscription' | 'usage' | 'refund'
  hir_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface GROResult {
  mode: GROMode
  harm_score: number
  triggered_terms: string[]
}

export interface NPFResult {
  pass: boolean
  flags: string[]
}

// Supabase Database type (simplified for MVP)
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      health_intelligence_reports: {
        Row: HealthIntelligenceReport
        Insert: Partial<HealthIntelligenceReport>
        Update: Partial<HealthIntelligenceReport>
      }
      subscriptions: { Row: Subscription; Insert: Partial<Subscription>; Update: Partial<Subscription> }
      credit_transactions: {
        Row: CreditTransaction
        Insert: Partial<CreditTransaction>
        Update: Partial<CreditTransaction>
      }
      cvs_audit_log: {
        Row: CVSAuditEntry
        Insert: Partial<CVSAuditEntry>
        Update: Partial<CVSAuditEntry>
      }
    }
    Functions: {
      deduct_credit: { Args: { p_user_id: string }; Returns: number }
      add_credits: { Args: { p_user_id: string; p_amount: number }; Returns: number }
      refund_credit: { Args: { p_user_id: string; p_hir_id: string }; Returns: void }
    }
  }
}
