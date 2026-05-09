'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'

const DOCUMENT_TYPES = ['Professional License', 'Registration Certificate', 'Board Certificate', 'Government-Issued ID']

type Step = 1 | 2 | 3

export default function CVSSubmitPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [practitionerType, setPractitionerType] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
  })

  const handleSubmit = async () => {
    if (!file) return
    setError('')
    setUploading(true)
    setProgress(20)

    try {
      const form = new FormData()
      form.append('credential', file)
      form.append('document_type', documentType)
      setProgress(50)

      const res = await fetch('/api/cvs/submit', { method: 'POST', body: form })
      setProgress(80)
      const data = await res.json()

      if (!res.ok) { setError(data.error || 'Submission failed'); return }
      setProgress(100)
      setStep(3)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress steps */}
        <div className="flex items-center justify-center mb-10 gap-3">
          {([1, 2, 3] as Step[]).map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step >= s ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s}
              </div>
              {s < 3 && <div className={`w-16 h-0.5 ${step > s ? 'bg-primary-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Step 1: Type Selection */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold mb-1">Credential Type</h2>
              <p className="text-gray-500 text-sm mb-6">Select your practitioner type and document type</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Practitioner Type</label>
                  <select
                    value={practitionerType}
                    onChange={e => setPractitionerType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select type…</option>
                    {['Pharmacist','Herbalist','Nutritionist','General Practitioner','Specialist Physician',
                      'Nurse Practitioner','Naturopath','Dietitian','Physiotherapist','Osteopath',
                      'Chiropractor','Acupuncturist','Traditional Medicine Practitioner','Pharmacognosist',
                      'Clinical Biochemist','Medical Laboratory Scientist','Health Coach (Licensed)',
                      'Integrative Medicine Practitioner'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DOCUMENT_TYPES.map(d => (
                      <button
                        key={d}
                        onClick={() => setDocumentType(d)}
                        className={`p-3 rounded-lg border-2 text-sm text-left transition-all
                          ${documentType === d ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!practitionerType || !documentType}
                className="mt-6 w-full bg-primary-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}

          {/* Step 2: File Upload */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-1">Upload Credential</h2>
              <p className="text-gray-500 text-sm mb-6">PDF, JPG or PNG · Max 10MB</p>
              {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4 text-sm">{error}</div>}

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                  ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}
              >
                <input {...getInputProps()} />
                <div className="text-4xl mb-3">📎</div>
                {file ? (
                  <p className="text-sm font-medium text-primary-600">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop your credential, or click to browse'}
                  </p>
                )}
              </div>

              {uploading && (
                <div className="mt-4">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">Processing…</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50">
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file || uploading}
                  className="flex-1 bg-primary-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Submit for Verification'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Submitted */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold mb-2">Submitted Successfully</h2>
              <p className="text-gray-600 text-sm mb-6">
                Your credential is being processed. You'll receive an email notification once verification is complete (typically within 2 hours).
              </p>
              <button
                onClick={() => router.push('/cvs/status')}
                className="bg-primary-500 text-white font-semibold px-6 py-2.5 rounded-lg"
              >
                View Status →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
