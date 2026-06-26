import { MVZ_SYSTEM_PROMPT } from './prompts'
import { callApiAi, extractJsonFromResponse } from './api-client'
import { callLocalAi } from './webllm'
import { parseMvz, validateMvz } from '../core/mvz/parser'
import type { AiSettings } from '../stores/settingsStore'
import type { MvzDocument } from '../core/mvz/types'

export interface GenerateResult {
  doc?: MvzDocument
  code?: string
  error?: string
}

export async function generateMvzFromPrompt(
  prompt: string,
  settings: AiSettings,
  onLocalProgress?: (text: string, progress?: number) => void,
): Promise<GenerateResult> {
  let lastError = ''

  for (let attempt = 0; attempt < 3; attempt++) {
    const userMsg =
      attempt === 0
        ? prompt
        : `${prompt}\n\nPrevious output was invalid: ${lastError}. Fix and output valid MVZ JSON only.`

    let raw: string
    try {
      if (settings.mode === 'local') {
        onLocalProgress?.('Loading model...', 0)
        raw = await callLocalAi(
          settings.localModel,
          userMsg,
          MVZ_SYSTEM_PROMPT,
          (report) => {
            const pct = report.progress * 100
            onLocalProgress?.(`Downloading model: ${pct.toFixed(0)}%`, pct)
          },
        )
      } else {
        if (!settings.apiKey) return { error: 'API key required' }
        raw = await callApiAi(settings, userMsg, MVZ_SYSTEM_PROMPT)
      }
    } catch (e) {
      return { error: (e as Error).message }
    }

    const jsonStr = extractJsonFromResponse(raw)
    const { doc, error: parseError } = parseMvz(jsonStr)
    if (parseError) {
      lastError = parseError
      continue
    }

    const validation = validateMvz(doc)
    if (!validation.valid) {
      lastError = validation.error ?? 'Validation failed'
      continue
    }

    return { doc, code: JSON.stringify(doc, null, 2) }
  }

  return { error: lastError || 'Failed to generate valid MVZ after retries' }
}
