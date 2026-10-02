/** Shared plumbing for prompt:run / prompt:check (dev scripts, never CI — docs/10 Tier 5). */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { getPromptTemplate } from '../src/prompts/registry'
import { modelRequestFields, SEARCH_DEADLINE_MS, serverToolError } from '../src/prompts/request'
import { MODEL_IDS, type AnyPromptTemplate } from '../src/prompts/types'

export const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export interface ScriptArgs {
  kind: string | undefined
  /** `--only <fixture>`: run one input fixture instead of all of them. */
  only: string | undefined
  record: boolean
}

export function parseScriptArgs(argv: string[]): ScriptArgs {
  const onlyIndex = argv.indexOf('--only')
  const only = onlyIndex >= 0 ? argv[onlyIndex + 1] : undefined
  if (onlyIndex >= 0 && (!only || only.startsWith('--'))) {
    console.error('--only needs a fixture name, e.g. --only default')
    process.exit(1)
  }
  const positional = argv.filter(
    (a, i) => !a.startsWith('--') && (onlyIndex < 0 || i !== onlyIndex + 1),
  )
  return { kind: positional[0], only, record: argv.includes('--record') }
}

export function requireTemplate(kind: string | undefined): AnyPromptTemplate {
  if (!kind) {
    console.error(
      'usage: pnpm prompt:run <kind> [--only <fixture>] [--record]  |  pnpm prompt:check <kind> [--only <fixture>]',
    )
    process.exit(1)
  }
  const template = getPromptTemplate(kind)
  if (!template) {
    console.error(`unknown or not-yet-implemented kind "${kind}"`)
    process.exit(1)
  }
  return template
}

/**
 * All input fixtures for a kind: `<kind>.json` (named `default`) plus
 * `<kind>.<variant>.json` (named `<variant>`) — the names recordings are filed
 * under in `fixtures/recorded/<kind>/`. `only` narrows it to one, so iterating
 * on a prompt costs one call instead of one per fixture.
 */
export function loadFixtures(kind: string, only?: string): { name: string; params: unknown }[] {
  const dir = join(pkgRoot, 'fixtures/prompt-inputs')
  const files = readdirSync(dir).filter(
    (f) => f === `${kind}.json` || (f.startsWith(`${kind}.`) && f.endsWith('.json')),
  )
  if (files.length === 0) {
    console.error(`no input fixture for ${kind} in fixtures/prompt-inputs/`)
    process.exit(1)
  }
  const fixtures = files.sort().map((f) => ({
    name: f === `${kind}.json` ? 'default' : f.slice(kind.length + 1).replace(/\.json$/, ''),
    file: f,
  }))
  const chosen = only ? fixtures.filter((f) => f.name === only) : fixtures
  if (chosen.length === 0) {
    console.error(
      `no fixture "${only}" for ${kind}; have: ${fixtures.map((f) => f.name).join(', ')}`,
    )
    process.exit(1)
  }
  return chosen.map(({ name, file }) => ({
    name,
    params: JSON.parse(readFileSync(join(dir, file), 'utf8')) as unknown,
  }))
}

export interface LiveResult {
  text: string
  usage: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
  }
  latencyMs: number
  model: string
  /**
   * Why the run was cut short, as the app would cut it: a failed search or the
   * search deadline (docs/04 §Usage metering). Text and usage are then empty.
   */
  stopped?: string
}

export async function runLive(template: AnyPromptTemplate, params: unknown): Promise<LiveResult> {
  const parsed = template.paramsSchema.parse(params)
  const rendered = template.render(parsed as never)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('No ANTHROPIC_API_KEY: put it in apps/web/.env or export it.')
    process.exit(1)
  }
  const client = new Anthropic()
  const started = Date.now()

  const stream = client.messages.stream({
    // Exactly the fields the proxy sends, so a live run is the app's call.
    ...(modelRequestFields(template) as Omit<Anthropic.MessageStreamParams, 'messages'>),
    system: rendered.system.map((b) => ({
      type: 'text' as const,
      text: b.text,
      ...(b.cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
    })),
    messages: rendered.messages.map((m) => ({ role: m.role, content: m.content })),
  })

  stream.on('text', (delta) => process.stderr.write(delta))

  // The app's two stops on a searching call, so a check can't run away either.
  let stopped: string | undefined
  const stop = (reason: string) => {
    stopped ??= reason
    stream.abort()
  }
  stream.on('streamEvent', (event) => {
    if (event.type !== 'content_block_start') return
    const code = serverToolError(event.content_block)
    if (code !== undefined) stop(`search failed: ${code}`)
  })
  const timer = template.tools?.webSearch
    ? setTimeout(() => stop(`search deadline (${SEARCH_DEADLINE_MS / 1000}s)`), SEARCH_DEADLINE_MS)
    : undefined

  let message: Anthropic.Message
  try {
    message = await stream.finalMessage()
  } catch (e) {
    if (stopped === undefined) throw e
    process.stderr.write(`\n[stopped: ${stopped}]\n`)
    return {
      text: '',
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      latencyMs: Date.now() - started,
      model: MODEL_IDS[template.model],
      stopped,
    }
  } finally {
    clearTimeout(timer)
  }
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
