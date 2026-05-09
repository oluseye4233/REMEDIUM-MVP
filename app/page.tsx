import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-primary-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-primary-100 text-sm font-semibold tracking-widest uppercase mb-4">
              FORGE Certified · JCSE 50/50 · ERB ULTRA SI v2.0
            </p>
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              REMEDIUM SI
            </h1>
            <p className="text-xl text-primary-100 mb-4">
              Health Intelligence Reports for Licensed Practitioners
            </p>
            <p className="text-primary-200 mb-10 max-w-2xl">
              Generate evidence-based Health Intelligence Reports across pharmacy, herbal medicine,
              pharmacognosy, nutrition, fitness, and wellness — exclusively for verified licensed health professionals.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/register"
                className="bg-white text-primary-500 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="border border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '🔬',
              title: 'ERB ULTRA SI Engine',
              desc: 'Powered by Anthropic Claude — synthesizes evidence across 7 integrated health domains with Grade A/B/C evidence hierarchy.',
            },
            {
              icon: '🛡️',
              title: 'CVS Verification',
              desc: 'Credential Verification System ensures every practitioner is license-verified before accessing health intelligence.',
            },
            {
              icon: '📄',
              title: 'Professional HIRs',
              desc: 'Structured 10-section Health Intelligence Reports with interaction matrices, monitoring frameworks, and full citations.',
            },
            {
              icon: '⚖️',
              title: 'GRO Safety Protocol',
              desc: 'Governance & Risk Operations system with 3-layer Non-Prescriptive Filter ensures every report is safe and compliant.',
            },
            {
              icon: '💊',
              title: '7 Health Domains',
              desc: 'Pharmacy · Herbal · Pharmacognosy · Nutrition · Fitness · Wellness · Integrative',
            },
            {
              icon: '💳',
              title: 'Simple Pricing',
              desc: '$29/month Personal plan includes 10 HIR credits. Additional credits from $79 (20 credits) or $179 (50 credits).',
            },
          ].map((f, i) => (
            <div key={i} className="p-6 border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-50 border-t">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to elevate your clinical intelligence?
          </h2>
          <p className="text-gray-600 mb-8">
            Join verified licensed health professionals using REMEDIUM SI.
          </p>
          <Link
            href="/register"
            className="bg-primary-500 text-white font-semibold px-10 py-4 rounded-lg hover:bg-primary-600 transition-colors text-lg"
          >
            Get Started — 7-Day Free Trial
          </Link>
        </div>
      </div>
    </main>
  )
}
