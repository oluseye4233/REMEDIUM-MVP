import type { NPFResult } from '@/types'

const PROHIBITED_PATTERNS: RegExp[] = [
  /you should (take|use|consume|start)\s+\d+\s*mg/i,
  /prescrib(e|ing|ed)\s+\d+\s*mg/i,
  /I diagnose/i,
  /^you (have|are suffering from|are diagnosed with)/im,
  /this will cure/i,
  /guaranteed to treat/i,
  /clinically proven to (cure|treat|prevent)/i,
  /stop taking your (medication|prescription)/i,
  /replace your doctor/i,
  /take \d+\s*(mg|mcg|g|ml|units?) of/i,
  /your diagnosis is/i,
  /you are experiencing/i,
  /patient should (take|use|receive)/i,
  /administer \d+/i,
]

export function l2RegexCheck(content: string): NPFResult {
  const flags = PROHIBITED_PATTERNS
    .filter(p => p.test(content))
    .map(p => p.source)

  return { pass: flags.length === 0, flags }
}
