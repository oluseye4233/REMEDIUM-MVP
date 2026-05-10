import type { HIRContent, EvidenceGrade, HealthDomain } from '@/types'
import { extractInteractionMatrix } from './interactions'

function extractSection(text: string, sectionHeader: string): string {
  const patterns = [
    new RegExp(`Section [A-J][^]*?${sectionHeader}[:\\s]*([^]*?)(?=\\nSection [A-J]|$)`, 'i'),
    new RegExp(`#+\\s*${sectionHeader}[^]*?([^]*?)(?=\\n#+|$)`, 'i'),
    new RegExp(`${sectionHeader}[:\\s]*([^]*?)(?=\\n[A-Z][A-Z ]+:|$)`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]?.trim()) return match[1].trim()
  }
  return '[Section content unavailable — please regenerate this report]'
}

function extractCitations(text: string): string[] {
  const citationMatch = text.match(/Section J[^]*?(?=$)/i)
  if (!citationMatch) return []

  return citationMatch[0]
    .split('\n')
    .filter(line => /^\d+\.|^-|^\*/.test(line.trim()))
    .map(line => line.replace(/^[\d\.\-\*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 30)
}

export function detectEvidenceGrade(text: string): EvidenceGrade {
  const rctCount = (text.match(/randomized controlled trial|RCT|meta-analysis|systematic review/gi) || []).length
  const observationalCount = (text.match(/cohort study|observational|retrospective|case-control/gi) || []).length
  if (rctCount >= 3) return 'A'
  if (rctCount >= 1 || observationalCount >= 3) return 'B'
  return 'C'
}

export function structureHIRContent(rawERBOutput: string, domains: HealthDomain[]): HIRContent {
  return {
    executive_summary:      extractSection(rawERBOutput, 'Executive Summary'),
    evidence_hierarchy:     extractSection(rawERBOutput, 'Evidence Hierarchy'),
    domain_protocols: domains.map(domain => ({
      domain,
      content: extractSection(rawERBOutput, domain) ||
               extractSection(rawERBOutput, `${domain} Protocol`) ||
               extractSection(rawERBOutput, 'Primary Domain Protocol'),
    })),
    interaction_matrix:     extractInteractionMatrix(rawERBOutput),
    quality_standards:      extractSection(rawERBOutput, 'Quality Standards'),
    monitoring_framework:   extractSection(rawERBOutput, 'Monitoring'),
    cultural_considerations:extractSection(rawERBOutput, 'Cultural'),
    citations:              extractCitations(rawERBOutput),
    evidence_grade:         detectEvidenceGrade(rawERBOutput),
    disclaimer:             '',
  }
}
