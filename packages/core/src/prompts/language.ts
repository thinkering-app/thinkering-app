import type { Language } from '../language'
import type { AnyPromptTemplate, PromptKind, RenderedPrompt } from './types'

/**
 * Content language (docs/04 §Content language, docs/00 D23). Prompts stay in
 * English whatever the learner reads: the instructions are tuned in English
 * and the model's teaching knowledge doesn't depend on the prompt's language.
 * A non-English learner gets one extra system block telling the model what to
 * write in. English prompts are byte-identical to what they were before.
 */

const LANGUAGE_LABEL: Record<Exclude<Language, 'en'>, string> = {
  es: 'Spanish',
  'zh-Hans': 'Simplified Chinese',
}

const LANGUAGE_NOTES: Record<Exclude<Language, 'en'>, string> = {
  es: 'Address the learner as tú. Use neutral Spanish that reads naturally in both Spain and Latin America. Keep to the length limits: Spanish runs longer than English, so write tightly.',
  'zh-Hans':
    'Use Simplified characters only and Chinese full-width punctuation (，。？：) in prose. To quote a word or phrase inside a string, use “ ” — never a straight double quote, which ends the JSON string. Address the learner as 你. "Sentence case" does not apply. Where a limit is given in words, read one word as about two characters.',
}

const ACTIVITY_KINDS: readonly PromptKind[] = [
  'activity.generate',
  'activity.review',
  'activity.question',
]

const RESOURCE_KINDS: readonly PromptKind[] = [
  'resources.search',
  'resources.more',
  'resource.describe',
]

/** The language block for a kind, or null for English. */
export function languageInstructions(language: Language, kind: PromptKind): string | null {
  if (language === 'en') return null
  const name = LANGUAGE_LABEL[language]
  const lines = [
    `Language: the learner reads ${name}. Write every learner-facing string in ${name}, as a native writer would, not as a translation from English. These instructions and parts of the learner context are in English; that doesn't change the output language. JSON keys, enum values, ids and URLs stay exactly as specified.`,
    `Use examples, names, currency, units and cultural references natural to a ${name} reader. The tone rules still hold: plain, warm, adult, no cheerleading.`,
    LANGUAGE_NOTES[language],
    `If the interest is learning a language, that language is the subject: target words, phrases and examples stay in it, and the explanations are in ${name}.`,
  ]
  if (ACTIVITY_KINDS.includes(kind)) {
    lines.push(
      language === 'zh-Hans'
        ? 'fillBlank: each blank is one short word or term, written as ___ with no spaces around it; list other correct forms in "alts".'
        : 'fillBlank: each blank is one short word or term; list other correct forms (for example, without accents) in "alts".',
    )
  }
  if (RESOURCE_KINDS.includes(kind)) {
    lines.push(
      `Prefer good sources in ${name}. An English source is fine when it's clearly better or there's nothing comparable; the descriptions you write are still in ${name}.`,
    )
  }
  return lines.join('\n\n')
}

/**
 * Renders a template in a language: the template's own prompt, plus the
 * language block after the cached system blocks. It carries no cache mark, so
 * the cached prefix stays shared across languages. Every caller — the proxy,
 * the BYO-key client, the prompt scripts — renders through here.
 */
export function renderPrompt(
  template: AnyPromptTemplate,
  params: unknown,
  language: Language,
): RenderedPrompt {
  const rendered = template.render(params as never)
  const block = languageInstructions(language, template.kind)
  return block ? { ...rendered, system: [...rendered.system, { text: block }] } : rendered
}
