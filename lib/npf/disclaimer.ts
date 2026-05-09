export function injectDisclaimer(
  practitionerType: string,
  date: string,
  hirType: string
): string {
  return `
⚠️ IMPORTANT — NON-PRESCRIPTIVE REFERENCE NOTICE

This Health Intelligence Report (HIR) is produced by REMEDIUM SI, powered by ERB ULTRA SI v2.0.
For the exclusive use of a verified licensed ${practitionerType}.

THIS REPORT:
• Is for educational and professional reference purposes ONLY
• Does NOT constitute a diagnosis, prescription, or treatment plan
• Does NOT replace clinical judgment, laboratory testing, or direct patient assessment
• Does NOT supersede the advice of the patient's primary healthcare provider
• Must be interpreted within your verified scope of practice

The information provided reflects evidence-based reference intelligence across integrated health
domains at the time of generation (${date}). All recommendations must be interpreted and applied
within your scope of practice and in the context of direct patient assessment.

REMEDIUM SI accepts no liability for clinical outcomes resulting from the application of this
reference report. By downloading this HIR, you confirm your credentials as a licensed health
practitioner and accept sole clinical responsibility for its application.

Generated: ${date} | HIR Type: ${hirType} | Platform: REMEDIUM SI v1.0
Powered by ERB ULTRA SI v2.0 (JCSE 50/50) | FORGE Certified Ultra Premium
`.trim()
}
