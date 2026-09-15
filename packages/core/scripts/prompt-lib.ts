/** Shared plumbing for prompt:run / prompt:check (dev scripts, never CI — docs/10 Tier 5). */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { getPromptTemplate } from '../src/prompts/registry'
import { MODEL_IDS, type AnyPromptTemplate } from '../src/prompts/types'

export const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export function requireTemplate(kind: string | undefined): AnyPromptTemplate {
  if (!kind) {
    console.error('usage: pnpm prompt:run <kind> [--record]  |  pnpm prompt:check <kind>')
    process.exit(1)
  }
  const template = getPromptTemplate(kind)
  if (!template) {
    console.error(`unknown or not-yet-implemented kind "${kind}"`)
    process.exit(1)
  }
  return template
}

/** All input fixtures for a kind: `<kind>.json` plus `<kind>.<variant>.json`. */
export function loadFixtures(kind: string): { name: string; params: unknown }[] {
  const dir = join(pkgRoot, 'fixtures/prompt-inputs')
  const files = readdirSync(dir).filter((f) => f === `${kind}.json` || (f.startsWith(`${kind}.`) && f.endsWith('.json')))
  if (files.length === 0) {
    console.error(`no input fixture for ${kind} in fixtures/prompt-inputs/`)
    process.exit(1)
  }
  return files.sort().map((f) => ({
    name: f.replace(/\.json$/, ''),
    params: JSON.parse(readFileSync(join(dir, f), 'utf8')) as unknown,
  }))
}

export interface LiveResult {
  text: string
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }
  latencyMs: number
  model: string
}

export async function runLive(template: AnyPromptTemplate, params: unknown): Promise<LiveResult> {
  const parsed = template.paramsSchema.parse(params)
  const rendered = template.render(parsed as never)
  const client = new Anthropic()
  const started = Date.now()

  const stream = client.messages.stream({
    model: MODEL_IDS[template.model],
    max_tokens: template.maxTokens,
    ...(template.model === 'haiku' && template.temperature !== undefined
      ? { temperature: template.temperature }
      : {}),
    system: rendered.system.map((b) => ({
      type: 'text' as const,
      text: b.text,
      ...(b.cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
    })),
    messages: rendered.messages.map((m) => ({ role: m.role, content: m.content })),
  })

  stream.on('text', (delta) => process.stderr.write(delta))
  const message = await stream.finalMessage()
  process.stderr.write('\n')

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return {
    text,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
    },
    latencyMs: Date.now() - started,
    model: message.model,
  }
}
