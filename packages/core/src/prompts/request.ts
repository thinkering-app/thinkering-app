import { MODEL_IDS, type AnyPromptTemplate, type PromptEffort } from './types'

/**
 * The Messages API fields a template decides — model, limits, thinking,
 * sampling, server tools — in wire shape. The proxy, the BYO-key client and the
 * prompt scripts all spread this, so a live run is the call the app makes; each
 * caller adds only its own system/messages/stream. Plain JSON: packages/core
 * has no SDK dependency.
 */
export interface ModelRequestFields {
  model: string
  max_tokens: number
  thinking?: { type: 'adaptive' }
  output_config?: { effort: PromptEffort }
  temperature?: number
  tools?: { type: 'web_search_20260209'; name: 'web_search'; max_uses: number }[]
}

export function modelRequestFields(template: AnyPromptTemplate): ModelRequestFields {
  return {
    model: MODEL_IDS[template.model],
    max_tokens: template.maxTokens,
    ...(template.effort
      ? { thinking: { type: 'adaptive' as const }, output_config: { effort: template.effort } }
      : {}),
    // Sonnet 5 rejects sampling parameters; temperature is haiku-only.
    ...(template.model === 'haiku' && template.temperature !== undefined
      ? { temperature: template.temperature }
      : {}),
    ...(template.tools?.webSearch
      ? {
          tools: [
            {
              type: 'web_search_20260209' as const,
              name: 'web_search' as const,
              max_uses: template.tools.webSearch.maxUses,
            },
          ],
        }
      : {}),
  }
}
