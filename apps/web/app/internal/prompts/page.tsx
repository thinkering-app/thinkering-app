import type { Metadata } from 'next'
import {
  estimateTokens,
  getPromptTemplate,
  modelRequestFields,
  PROMPTS,
  SHARED_PREAMBLE,
  type AnyPromptTemplate,
  type ImplementedKind,
  type RenderedPrompt,
} from '@thinkering/core'
import { renderPromptFixture } from '@thinkering/core/prompt-inputs'

import { requireArea } from '@/lib/server/internal-session'
import { PromptFlow } from './flow'

/**
 * Every prompt template at its current version, rendered against its default
 * input fixture — the same render the proxy sends (docs/04). A read-only view
 * of `packages/core/src/prompts`: the PR snapshot diff is still the review,
 * and the AI Inspector is still where live calls are read.
 */

export const metadata: Metadata = { title: 'Prompts' }

const KINDS = Object.keys(PROMPTS) as ImplementedKind[]

/** The registry's existential view: concrete params types don't survive a union. */
function templateFor(kind: ImplementedKind): AnyPromptTemplate {
  return getPromptTemplate(kind)!
}

/** Block 0 is the shared preamble on every kind, so it is shown once up top. */
function ownSystemBlocks(rendered: RenderedPrompt) {
  return rendered.system.filter((block) => block.text !== SHARED_PREAMBLE)
}

/** The context block's own heading, so this can't disagree with what is sent. */
function readsContext(rendered: RenderedPrompt): boolean {
  return rendered.messages.some((m) => m.content.includes('## Learner context'))
}

function renderedText(rendered: RenderedPrompt): string {
  return [...rendered.system.map((b) => b.text), ...rendered.messages.map((m) => m.content)].join(
    '\n',
  )
}

const cell = 'px-3 py-2 text-secondary text-ink-soft'
const pill = 'rounded-pill bg-cornflower-tint px-2.5 py-0.5 text-caption text-cornflower-deep'
const text = 'whitespace-pre-wrap break-words font-mono text-caption text-ink-soft'

export default async function InternalPrompts() {
  await requireArea('prompts')

  const rendered = Object.fromEntries(
    KINDS.map((kind) => [kind, renderPromptFixture(kind)]),
  ) as Record<ImplementedKind, RenderedPrompt>

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-heading-bold text-display-md font-bold text-ink">Prompts</h1>
      <p className="mt-3 max-w-2xl text-body text-ink-soft">
        The {KINDS.length} generation kinds, each rendered against its default input fixture — what
        the model is sent at the version currently in <code>packages/core</code>.
      </p>

      <div className="mt-8 overflow-x-auto rounded-card border border-hairline bg-surface">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline">
              <th className={`${cell} font-medium text-ink`}>Kind</th>
              <th className={`${cell} font-medium text-ink`}>Version</th>
              <th className={`${cell} font-medium text-ink`}>Model</th>
              <th className={`${cell} font-medium text-ink`}>Effort</th>
              <th className={`${cell} font-medium text-ink`}>Max tokens</th>
              <th className={`${cell} font-medium text-ink`}>Fixture size</th>
            </tr>
          </thead>
          <tbody>
            {KINDS.map((kind) => {
              const template = templateFor(kind)
              const fields = modelRequestFields(template)
              return (
                <tr key={kind} className="border-b border-hairline last:border-0">
                  <td className={cell}>
                    <a href={`#${kind}`} className="text-cornflower-deep hover:underline">
                      {kind}
                    </a>
                  </td>
                  <td className={cell}>v{template.version}</td>
                  <td className={cell}>{fields.model}</td>
                  <td className={cell}>
                    {template.effort ??
                      (template.temperature === undefined ? '—' : `temp ${template.temperature}`)}
                  </td>
                  <td className={cell}>{template.maxTokens.toLocaleString('en-US')}</td>
                  <td className={cell}>
                    ~{estimateTokens(renderedText(rendered[kind])).toLocaleString('en-US')} tok
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <PromptFlow readsContext={new Set(KINDS.filter((kind) => readsContext(rendered[kind])))} />

      <details className="mt-8 rounded-card border border-hairline bg-surface p-5">
        <summary className="cursor-pointer font-heading text-heading text-ink">
          Shared preamble
        </summary>
        <p className="mt-2 text-secondary text-ink-soft">
          System block 0 on every kind, byte-identical so the prompt cache hits. Not repeated below.
        </p>
        <p className={`mt-3 ${text}`}>{SHARED_PREAMBLE}</p>
      </details>

      <div className="mt-8 flex flex-col gap-6">
        {KINDS.map((kind) => {
          const template = templateFor(kind)
          const prompt = rendered[kind]
          const blocks = ownSystemBlocks(prompt)
          return (
            <section
              key={kind}
              id={kind}
              className="scroll-mt-6 rounded-card border border-hairline bg-surface p-6"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-heading text-heading text-ink">{kind}</h2>
                <span className={pill}>v{template.version}</span>
                <span className={pill}>{modelRequestFields(template).model}</span>
                {template.effort ? <span className={pill}>{template.effort} effort</span> : null}
                {template.tools?.webSearch ? (
                  <span className={pill}>web search ×{template.tools.webSearch.maxUses}</span>
                ) : null}
              </div>

              <div className="mt-5 flex flex-col gap-4">
                {blocks.map((block, index) => (
                  <div key={index}>
                    <p className="text-caption font-medium text-ink">
                      System {index + 1}
                      {block.cache ? ' · cached' : ''}
                    </p>
                    <p className={`mt-1 ${text}`}>{block.text}</p>
                  </div>
                ))}
                {prompt.messages.map((message, index) => (
                  <div key={`m${index}`}>
                    <p className="text-caption font-medium text-ink">{message.role}</p>
                    <p className={`mt-1 ${text}`}>{message.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
