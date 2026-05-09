export function zposOptimize(text: string): string {
  return text
    .replace(/^(Certainly!?|Sure!?|Of course!?|I'll now|Let me|Here is|Here's|I'll provide|Allow me)\s[^\n]*/gmi, '')
    .replace(/^(Great question!|Excellent request!|I understand you're asking)[^\n]*/gmi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
