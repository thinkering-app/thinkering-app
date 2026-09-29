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

/**
 * How long a call that searches the web may run before it is stopped (docs/04
 * §Usage metering). Web search runs its whole loop inside one request, so
 * nothing else bounds it: a search that keeps failing retries until the
 * server gives up, and one recorded run spent 13 minutes and 36k output
 * tokens producing nothing. Under the proxy's 300-second `maxDuration`, so
 * the proxy stops the call and settles it rather than being killed mid-stream;
 * a good G4 search has taken about three minutes.
 */
export const SEARCH_DEADLINE_MS = 240_000

/**
 * The error code of a failed server tool, if this content block is one.
 *
 * Server tools don't raise. A search that was rate limited or ran out of uses
 * comes back as a normal 200 whose tool-result block holds a single error
 * object instead of a list of results, so an outage is indistinguishable from
 * a good answer unless it is looked for. The first one ends the call: the
 * model otherwise keeps searching into the same error, paid for each time.
 */
export function serverToolError(block: unknown): string | undefined {
  const { type, content } = (block ?? {}) as { type?: string; content?: unknown }
  if (type !== 'web_search_tool_result' && type !== 'web_fetch_tool_result') return undefined
  // Success is a list of results; failure is one object carrying `error_code`.
  if (content === null || typeof content !== 'object' || Array.isArray(content)) return undefined
  return (content as { error_code?: string }).error_code ?? 'unknown'
}
