import type { HealthDomain, ATLASSection, HIRRequest } from '@/types'

const SECTION_MAP: Record<HealthDomain, ATLASSection[]> = {
  Pharmacy:      ['A', 'B', 'C', 'D'],
  Herbal:        ['A', 'B', 'C', 'E'],
  Nutrition:     ['A', 'B', 'C', 'F'],
  Fitness:       ['A', 'B', 'C', 'G'],
  Wellness:      ['A', 'B', 'G'],
  Pharmacognosy: ['A', 'B', 'C', 'E'],
  Integrative:   ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
}

export function routeAtlasPrompts(domains: HealthDomain[]): string {
  const sections = new Set<ATLASSection>()
  domains.forEach(d => (SECTION_MAP[d] || ['A', 'B']).forEach(s => sections.add(s)))
  // Always include interaction matrix and monitoring
  sections.add('A'); sections.add('B')
  return Array.from(sections).sort().join(',')
}

export function buildATLASPrompt(sections: string, params: HIRRequest): string {
  const sectionList = sections.split(',')
  const sectionDescriptions: Record<string, string> = {
    A: 'Executive Summary & Evidence Overview',
    B: 'Evidence Hierarchy & Quality Assessment (grade A/B/C)',
    C: `Primary Domain Protocols for: ${params.domains_requested.join(', ')}`,
    D: 'Pharmaceutical Considerations (drug interactions, pharmacokinetics, therapeutic monitoring)',
    E: 'Herbal & Pharmacognosy Reference (active constituents, traditional use, clinical evidence)',
    F: 'Nutritional Protocols (micronutrients, dietary considerations, clinical relevance)',
    G: 'Fitness & Wellness Protocols (exercise physiology, lifestyle interventions)',
  }

  const requestedSections = sectionList
    .map((s, i) => `Section ${s} — ${sectionDescriptions[s] || s}`)
    .join('\n')

  return `Generate a comprehensive Health Intelligence Report (HIR) for a verified licensed health practitioner.

TOPIC: ${params.health_topic}
DOMAINS: ${params.domains_requested.join(', ')}
EVIDENCE THRESHOLD: Grade ${params.evidence_threshold} minimum
REPORT TYPE: ${params.report_type}

Generate the following ATLAS sections:
${requestedSections}

Also generate:
Section H — Interaction Reference Matrix (include ALL compound interactions found across domains)
Section I — Monitoring & Safety Framework
Section J — Citations & Evidence Bibliography (minimum 5 peer-reviewed sources, APA format)

Ensure all major claims are graded (A/B/C) and all significant interactions are flagged with severity (MAJOR/MODERATE/MINOR).`
}
