'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import type { HealthIntelligenceReport, HIRContent, InteractionEntry } from '@/types'

const SEVERITY_COLORS = { MAJOR: 'red', MODERATE: 'yellow', MINOR: 'green' }

function InteractionRow({ entry }: { entry: InteractionEntry }) {
  const color = SEVERITY_COLORS[entry.type] || 'gray'
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 px-3 text-sm font-medium">{entry.compound_a}</td>
      <td className="py-2 px-3 text-sm">{entry.compound_b}</td>
      <td className="py-2 px-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded bg-${color}-100 text-${color}-700`}>
          {entry.type}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-gray-600">{entry.mechanism}</td>
      <td className="py-2 px-3 text-xs text-gray-700">{entry.recommendation}</td>
    </tr>
  )
}

function Section({ title, content }: { title: string; content?: string }) {
  const [open, setOpen] = useState(true)
  if (!content?.trim()) return null
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 text-left"
      >
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      )}
    </div>
  )
}

export default function HIRViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [hir, setHir] = useState<HealthIntelligenceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/hir/history`)
      .then(r => r.json())
      .then(data => {
        const found = data.reports?.find((r: HealthIntelligenceReport) => r.id === id)
        setHir(found || null)
        setLoading(false)
      })
  }, [id])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/hir/${id}/download`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setDownloadUrl(data.download_url)
      window.open(data.download_url, '_blank')
    } catch {
      setError('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
  if (!hir) return <div className="min-h-screen flex items-center justify-center text-gray-500">Report not found.</div>

  const content = hir.report_content as HIRContent | null
  const hasMajorInteraction = content?.interaction_matrix?.some(i => i.type === 'MAJOR')
  const gradeColors: Record<string, string> = { A: 'green', B: 'yellow', C: 'orange' }
  const grade = hir.evidence_grade || 'C'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-primary-500 text-white rounded-xl p-6 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/dashboard" className="text-primary-100 text-xs hover:underline">← Dashboard</Link>
              <h1 className="text-xl font-bold mt-1">Health Intelligence Report</h1>
              <p className="text-primary-100 text-sm mt-1">
                {hir.hir_type?.toUpperCase()} · {hir.atlas_sections?.join(', ')} ·{' '}
                {new Date(hir.created_at).toLocaleDateString()}
              </p>
              {content?.domain_protocols && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {content.domain_protocols.map(d => (
                    <span key={d.domain} className="bg-primary-600 text-xs px-2 py-0.5 rounded">{d.domain}</span>
                  ))}
                </div>
              )}
            </div>
            <div className={`bg-${gradeColors[grade]}-400 text-white rounded-full w-14 h-14 flex flex-col items-center justify-center flex-shrink-0`}>
              <span className="text-xs font-medium">Grade</span>
              <span className="text-2xl font-black">{grade}</span>
            </div>
          </div>
        </div>

        {hasMajorInteraction && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 rounded-xl p-4 mb-4 text-sm font-medium">
            ⚠️ <strong>MAJOR INTERACTION(S) IDENTIFIED</strong> — Review the Interaction Reference Matrix carefully before clinical application.
          </div>
        )}

        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 mb-4 text-sm">{error}</div>}

        {content && (
          <div className="space-y-3">
            <Section title="Executive Summary" content={content.executive_summary} />
            <Section title="Evidence Hierarchy & Quality Assessment" content={content.evidence_hierarchy} />
            {content.domain_protocols?.map(p => (
              <Section key={p.domain} title={`${p.domain} Protocols`} content={p.content} />
            ))}

            {content.interaction_matrix?.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3">
                  <span className="font-semibold text-gray-900 text-sm">Interaction Reference Matrix</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Compound A', 'Compound B', 'Severity', 'Mechanism', 'Recommendation'].map(h => (
                          <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {content.interaction_matrix.map((entry, i) => <InteractionRow key={i} entry={entry} />)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Section title="Quality Standards" content={content.quality_standards} />
            <Section title="Monitoring & Safety Framework" content={content.monitoring_framework} />
            <Section title="Cultural Considerations" content={content.cultural_considerations} />

            {content.citations?.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3">
                  <span className="font-semibold text-gray-900 text-sm">Citations & Evidence Bibliography</span>
                </div>
                <ol className="px-4 py-3 space-y-1">
                  {content.citations.map((c, i) => (
                    <li key={i} className="text-xs text-gray-600">{i + 1}. {c}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Disclaimer — always expanded */}
            <div className="border-2 border-amber-200 bg-amber-50 rounded-lg p-4">
              <h3 className="font-bold text-amber-800 text-sm mb-2">⚠️ NON-PRESCRIPTIVE REFERENCE NOTICE</h3>
              <pre className="text-xs text-amber-700 whitespace-pre-wrap font-sans leading-relaxed">
                {content.disclaimer}
              </pre>
            </div>
          </div>
        )}

        {/* Download Bar */}
        <div className="sticky bottom-4 mt-6 bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Downloads: {hir.download_count} · Evidence Grade: <strong>{grade}</strong>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading || hir.status !== 'complete'}
            className="bg-primary-500 text-white font-semibold px-6 py-2 rounded-lg hover:bg-primary-600 disabled:opacity-50 text-sm"
          >
            {downloading ? 'Generating Link…' : '⬇️ Download PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
