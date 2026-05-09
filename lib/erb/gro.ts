import type { GROMode, GROResult, HealthDomain } from '@/types'

const HIGH_RISK_TERMS = [
  'pregnancy', 'pregnant', 'prenatal', 'breastfeeding', 'lactating',
  'pediatric', 'infant', 'neonatal', 'child dose',
  'warfarin', 'coumadin', 'anticoagulant',
  'cyclosporin', 'tacrolimus', 'immunosuppressant',
  'transplant', 'organ transplant',
  'chemotherapy', 'oncology', 'cancer treatment',
  'MAOIs', 'monoamine oxidase',
  'lithium', 'digoxin', 'digitalis',
  'overdose', 'toxicity', 'poisoning',
  'suicidal', 'self-harm', 'lethal dose',
]

const MODERATE_RISK_TERMS = [
  'epilepsy', 'seizure', 'anticonvulsant',
  'diabetes', 'insulin', 'hypoglycemic',
  'hypertension', 'antihypertensive',
  'thyroid', 'hypothyroid', 'hyperthyroid',
  'renal failure', 'kidney disease', 'nephrotoxic',
  'hepatic failure', 'liver disease', 'hepatotoxic',
  'elderly', 'geriatric', 'frail',
]

export function groPreFlight(topic: string, domains: HealthDomain[]): GROResult {
  const lowerTopic = topic.toLowerCase()

  const triggeredHighRisk = HIGH_RISK_TERMS.filter(t => lowerTopic.includes(t))
  const triggeredModerate = MODERATE_RISK_TERMS.filter(t => lowerTopic.includes(t))

  const highScore = triggeredHighRisk.length * 0.25
  const moderateScore = triggeredModerate.length * 0.10
  const harm_score = Math.min(1.0, highScore + moderateScore)

  let mode: GROMode
  if (harm_score >= 0.70 || triggeredHighRisk.length >= 3) {
    mode = 'CONTAINMENT'
  } else if (harm_score >= 0.25 || triggeredHighRisk.length >= 1) {
    mode = 'SAFE_LIFE'
  } else {
    mode = 'LIFE'
  }

  return {
    mode,
    harm_score,
    triggered_terms: [...triggeredHighRisk, ...triggeredModerate],
  }
}

export function getGROConstraint(mode: GROMode): string {
  switch (mode) {
    case 'CONTAINMENT':
      return '\n\n[CONTAINMENT MODE ACTIVE]: High-risk topic detected. Provide safety advisory ONLY. Do not generate full treatment protocols. List contraindications and safety concerns. Strongly recommend immediate specialist consultation.'
    case 'SAFE_LIFE':
      return '\n\n[SAFE_LIFE MODE ACTIVE]: Elevated risk topic. Be conservative in all recommendations. Flag any uncertainty explicitly with [CAUTION] markers. Recommend professional consultation at every significant decision point. Prioritize safety over comprehensiveness.'
    default:
      return ''
  }
}
