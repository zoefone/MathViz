import OpenAI from 'openai'
import type { AiSettings } from '../stores/settingsStore'

export async function callApiAi(
  settings: AiSettings,
  userPrompt: string,
  systemPrompt: string,
): Promise<string> {
  const client = new OpenAI({
    apiKey: settings.apiKey || 'no-key',
    baseURL: settings.baseURL,
    dangerouslyAllowBrowser: true,
  })

  const response = await client.chat.completions.create({
    model: settings.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  })

  return response.choices[0]?.message?.content ?? ''
}

export function extractJsonFromResponse(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text.trim()
}
