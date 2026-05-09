import { createClient } from '@/lib/supabase/server'
import type { HIRContent, InteractionEntry } from '@/types'

function formatInteractionMatrix(interactions: InteractionEntry[]): string {
  if (!interactions.length) return 'No significant interactions identified for this combination.'
  return interactions
    .map(i => `${i.compound_a} + ${i.compound_b} [${i.type}]: ${i.mechanism}. ${i.recommendation}`)
    .join('\n')
}

export async function generateAndStorePDF(
  hirId: string,
  content: HIRContent
): Promise<{ pdfPath: string; downloadUrl: string }> {
  const { default: jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = 210
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 10

  const addPage = () => { doc.addPage(); y = 20 }
  const checkPage = (needed: number) => { if (y + needed > 275) addPage() }

  const sectionTitle = (title: string) => {
    checkPage(14)
    doc.setFontSize(13)
    doc.setTextColor(26, 107, 58)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, y)
    y += 8
    doc.setTextColor(38, 50, 56)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
  }

  const addText = (text: string, fontSize = 9) => {
    if (!text?.trim()) return
    doc.setFontSize(fontSize)
    const lines = doc.splitTextToSize(text.trim(), contentWidth)
    lines.forEach((line: string) => {
      checkPage(6)
      doc.text(line, margin, y)
      y += 5
    })
    y += 3
  }

  // ── Cover Page ──────────────────────────────────────────────
  doc.setFillColor(26, 107, 58)
  doc.rect(0, 0, pageWidth, 45, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('REMEDIUM SI', margin, 22)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Health Intelligence Report', margin, 33)

  // Evidence grade badge
  const gradeColors: Record<string, [number, number, number]> = {
    A: [34, 197, 94], B: [234, 179, 8], C: [249, 115, 22],
  }
  const gradeColor = gradeColors[content.evidence_grade] || [149, 165, 166]
  doc.setFillColor(...gradeColor)
  doc.circle(190, 22, 10, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(content.evidence_grade, 186.5, 25.5)

  y = 55
  doc.setTextColor(38, 50, 56)

  // MAJOR interaction warning banner
  if (content.interaction_matrix.some(i => i.type === 'MAJOR')) {
    doc.setFillColor(254, 226, 226)
    doc.rect(margin, y, contentWidth, 12, 'F')
    doc.setTextColor(185, 28, 28)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('⚠ MAJOR INTERACTION(S) IDENTIFIED — Review Interaction Matrix carefully before clinical application', margin + 3, y + 8)
    y += 16
    doc.setTextColor(38, 50, 56)
    doc.setFont('helvetica', 'normal')
  }

  // ── Report Sections ─────────────────────────────────────────
  if (content.executive_summary) {
    sectionTitle('Executive Summary')
    addText(content.executive_summary)
  }

  if (content.evidence_hierarchy) {
    sectionTitle('Evidence Hierarchy & Quality Assessment')
    addText(content.evidence_hierarchy)
  }

  content.domain_protocols.forEach(p => {
    if (p.content) {
      sectionTitle(`${p.domain.toUpperCase()} Protocols`)
      addText(p.content)
    }
  })

  if (content.interaction_matrix.length > 0) {
    sectionTitle('Interaction Reference Matrix')
    addText(formatInteractionMatrix(content.interaction_matrix))
  }

  if (content.quality_standards) {
    sectionTitle('Quality Standards')
    addText(content.quality_standards)
  }

  if (content.monitoring_framework) {
    sectionTitle('Monitoring & Safety Framework')
    addText(content.monitoring_framework)
  }

  if (content.cultural_considerations) {
    sectionTitle('Cultural Considerations')
    addText(content.cultural_considerations)
  }

  if (content.citations.length > 0) {
    sectionTitle('Citations & Evidence Bibliography')
    content.citations.forEach((c, i) => addText(`${i + 1}. ${c}`))
  }

  // ── Disclaimer ───────────────────────────────────────────────
  doc.addPage()
  y = 20
  doc.setFillColor(248, 249, 250)
  doc.rect(margin, y, contentWidth, 8, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 107, 58)
  doc.text('IMPORTANT — NON-PRESCRIPTIVE REFERENCE NOTICE', margin + 3, y + 6)
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  addText(content.disclaimer, 8)

  // ── Store PDF ────────────────────────────────────────────────
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  const pdfPath = `${hirId}/report.pdf`
  const supabase = await createClient()

  await supabase.storage.from('hir-reports').upload(pdfPath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  })

  const { data } = await supabase.storage
    .from('hir-reports')
    .createSignedUrl(pdfPath, 86400)

  return { pdfPath, downloadUrl: data?.signedUrl || '' }
}
