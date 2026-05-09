import type { InteractionEntry, EvidenceGrade } from '@/types'

export function extractInteractionMatrix(text: string): InteractionEntry[] {
  const interactions: InteractionEntry[] = []
  const sectionMatch = text.match(/Section H[^]*?(?=Section [I-J]|$)/i)
  if (!sectionMatch) return interactions

  const lines = sectionMatch[0].split('\n').filter(l => l.includes('|'))
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim()).filter(Boolean)
    if (parts.length >= 5 && !parts[0].toLowerCase().includes('compound')) {
      const severity = detectSeverity(parts[2] || '')
      interactions.push({
        compound_a: parts[0] || '',
        compound_b: parts[1] || '',
        type: severity,
        mechanism: parts[3] || '',
        clinical_significance: parts[4] || '',
        evidence_grade: detectGrade(line),
        recommendation: parts[5] || generateRecommendation(severity),
      })
    }
  }
  return interactions
}

function detectSeverity(text: string): 'MAJOR' | 'MODERATE' | 'MINOR' {
  const upper = text.toUpperCase()
  if (upper.includes('MAJOR') || upper.includes('CONTRAINDICATED') || upper.includes('SEVERE')) return 'MAJOR'
  if (upper.includes('MODERATE') || upper.includes('CAUTION') || upper.includes('MONITOR')) return 'MODERATE'
  return 'MINOR'
}

function detectGrade(text: string): EvidenceGrade {
  const rcts = (text.match(/RCT|randomized controlled|meta-analysis/gi) || []).length
  if (rcts >= 2) return 'A'
  if (rcts >= 1) return 'B'
  return 'C'
}

function generateRecommendation(severity: 'MAJOR' | 'MODERATE' | 'MINOR'): string {
  switch (severity) {
    case 'MAJOR': return 'AVOID combination. Consult specialist immediately.'
    case 'MODERATE': return 'Use with caution. Monitor closely. Consider alternatives.'
    default: return 'Monitor for adverse effects. Document in patient record.'
  }
}

export function hasMajorInteraction(interactions: InteractionEntry[]): boolean {
  return interactions.some(i => i.type === 'MAJOR')
}
