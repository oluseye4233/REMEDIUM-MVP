export function zposOptimize(text: string): string {
  return text
    // Strip AI preamble only when NOT preceded by a Section header on the same or previous line
    .replace(/^(Certainly!?|Sure!?|Of course!?|I'll now|I'll provide|Allow me)\s[^\n]*/gmi, '')
    .replace(/^(Great question!|Excellent request!|I understand you're asking)[^\n]*/gmi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
