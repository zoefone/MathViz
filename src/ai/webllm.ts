import type { InitProgressReport, MLCEngineInterface } from '@mlc-ai/web-llm'

let engine: MLCEngineInterface | null = null
let loading = false

export async function initWebLlm(
  model: string,
  onProgress?: (report: InitProgressReport) => void,
): Promise<MLCEngineInterface> {
  if (engine) return engine
  if (loading) {
    await new Promise<void>((resolve) => {
      const check = () => (engine ? resolve() : setTimeout(check, 200))
      check()
    })
    return engine!
  }

  loading = true
  try {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    engine = await CreateMLCEngine(model, {
      initProgressCallback: onProgress,
    })
    return engine
  } finally {
    loading = false
  }
}

export async function callLocalAi(
  model: string,
  userPrompt: string,
  systemPrompt: string,
  onProgress?: (report: InitProgressReport) => void,
): Promise<string> {
  const eng = await initWebLlm(model, onProgress)
  const response = await eng.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 2048,
  })
  return response.choices[0]?.message?.content ?? ''
}

export function resetWebLlm() {
  engine = null
}
