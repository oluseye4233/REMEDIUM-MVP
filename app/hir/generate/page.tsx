'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { HealthDomain, HIRType, EvidenceGrade } from '@/types'

const DOMAINS: { id: HealthDomain; icon: string; label: string; desc: string }[] = [
  { id: 'Pharmacy', icon: '💊', label: 'Pharmaceutical', desc: 'Drug interactions & pharmacokinetics' },
  { id: 'Herbal', icon: '🌿', label: 'Herbal', desc: 'Botanical medicine & plant therapeutics' },
  { id: 'Pharmacognosy', icon: '🧬', label: 'Pharmacognosy', desc: 'Natural product science & constituents' },
  { id: 'Nutrition', icon: '🥗', label: 'Nutrition', desc: 'Nutritional protocols & micronutrients' },
  { id: 'Fitness', icon: '🏃', label: 'Fitness', desc: 'Exercise physiology & lifestyle medicine' },
  { id: 'Wellness', icon: '🧘', label: 'Wellness', desc: 'Integrative wellness & prevention' },
]

const PROGRESS_STEPS = [
  'Routing to ERB ULTRA SI…',
  'Running GRO safety check…',
  'Generating report…',
  'Applying NPF safety filter…',
  'Creating PDF…',
]

export default function HIRGeneratePage() {
  const router = useRouter()
  const [domains, setDomains] = useState<HealthDomain[]>([])
  const [topic, setTopic] = useState('')
  const [reportType, setReportType] = useState<HIRType>('standard')
  const [evidenceThreshold, setEvidenceThreshold] = useState<EvidenceGrade>('B')
  const [generating, setGenerating] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [error, setError] = useState('')

  const toggleDomain = (d: HealthDomain) => {
    setDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const handleGenerate = async () => {
    setError('')
    setGenerating(true)
    setProgressStep(0)

    const interval = setInterval(() => {
      setProgressStep(p => Math.min(p + 1, PROGRESS_STEPS.length - 1))
    }, 3000)

    try {
      const res = await fetch('/api/hir/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: reportType,
          health_topic: topic,
          domains_requested: domains,
          evidence_threshold: evidenceThreshold,
        }),
      })
      const data = await res.json()
      clearInterval(interval)

      if (!res.ok) {
        if (data.redirect) router.push(data.redirect)
        setError(data.error || 'Generation failed')
        return
      }

      router.push(`/hir/${data.hir_id}`)
    } catch {
      setError('Generation failed. Please try again.')
    } finally {
      setGenerating(false)
      clearInterval(interval)
    }
  }

  const canGenerate = domains.length > 0 && topic.trim().length >= 10

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary-600">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Generate Health Intelligence Report</h1>
          <p className="text-gray-500 text-sm">Powered by ERB ULTRA SI v2.0 · 3-Layer NPF Safety Filter</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {error.includes('CONTAINMENT') ? (
              <><strong>⚠️ Safety Review Required:</strong> {error}</>
            ) : error}
          </div>
        )}

        {generating && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
              <span className="font-medium text-gray-900">{PROGRESS_STEPS[progressStep]}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-1000"
                style={{ width: `${((progressStep + 1) / PROGRESS_STEPS.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">Average generation time: 45–90 seconds</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Domain Selection */}
          <div>
            <label className="block font-semibold text-gray-900 mb-1">Health Domains</label>
            <p className="text-sm text-gray-500 mb-3">Select one or more domains for your HIR</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DOMAINS.map(d => (
                <button
                  key={d.id}
                  onClick={() => toggleDomain(d.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all
                    ${domains.includes(d.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="text-xl mb-1">{d.icon}</div>
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className="text-xs text-gray-500">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Health Topic */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="font-semibold text-gray-900">Health Topic</label>
              <span className={`text-xs ${topic.length > 450 ? 'text-red-500' : 'text-gray-400'}`}>
                {topic.length}/500
              </span>
            </div>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="e.g., Vitamin D and immune modulation in elderly patients with chronic kidney disease"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-amber-600 mt-1">⚠️ Do not include patient names, DOB, or identifiers (PHI)</p>
          </div>

          {/* Evidence Threshold */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">Minimum Evidence Grade</label>
            <div className="flex gap-3">
              {(['A', 'B', 'C'] as EvidenceGrade[]).map(g => (
                <button
                  key={g}
                  onClick={() => setEvidenceThreshold(g)}
                  className={`flex-1 py-3 rounded-lg border-2 text-sm transition-all
                    ${evidenceThreshold === g ? 'border-primary-500 bg-primary-50 font-bold text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-bold text-base">{g}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {g === 'A' ? 'RCTs only' : g === 'B' ? 'Observational+' : 'All evidence'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full bg-primary-500 text-white font-semibold py-3 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {generating ? 'Generating…' : `Generate HIR — 1 Credit`}
          </button>
        </div>
      </div>
    </div>
  )
}
