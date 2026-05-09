import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { GROMode } from '@/types'
import { getGROConstraint } from './gro'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

let cachedPersona: string | null = null

export function loadERBPersona(): string {
  if (cachedPersona) return cachedPersona
  const personaPath = join(process.cwd(), 'lib', 'erb', 'erb-persona.txt')
  cachedPersona = readFileSync(personaPath, 'utf-8')
  return cachedPersona
}

export async function callERBEngine(
  userPrompt: string,
  groMode: GROMode,
  maxTokens: number = 4096
): Promise<string> {
  const persona = loadERBPersona()
  const groConstraint = getGROConstraint(groMode)
  const systemPrompt = persona + groConstraint

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature: 0.1,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected ERB response type')
  return content.text
}
