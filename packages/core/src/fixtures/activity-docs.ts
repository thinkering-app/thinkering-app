import type { Tier } from '../domain'
import type { ActivityDoc } from '../schemas/activity-doc'

/**
 * Three hand-written Activity Documents, one per tier (WP1.3) — the renderer's
 * development fixtures and the seed data for the fixture interest
 * ("Understanding LLMs"). Concept ids match the seed goals in
 * packages/db/src/seed.ts; a test validates each doc against the schema.
 */

/** Introduce · plain-explainer · targets the "Prompting fundamentals" goal. */
export const FIXTURE_DOC_INTRODUCE: ActivityDoc = {
  version: 1,
  title: 'Say what you actually want',
  estMinutes: 5,
  tier: 'introduce',
  libraryItemId: 'plain-explainer',
  concepts: [
    { goalConceptId: 'c-prompt-clear', label: 'Clear instructions' },
    { goalConceptId: 'c-prompt-fewshot', label: 'Few-shot examples' },
  ],
  pages: [
    {
      id: 'intro-hook',
      kind: 'content',
      blocks: [
        { kind: 'heading', text: 'A new colleague, day one' },
        {
          kind: 'paragraph',
          md: 'Imagine briefing a sharp new colleague who knows nothing about your situation. "Make this better" gets you a shrug. "Shorten this to two sentences for a customer email" gets you work you can use.',
        },
        {
          kind: 'mcq',
          id: 'hook-q',
          prompt: 'Which brief would you rather receive on your first day?',
          options: [
            { id: 'a', label: '"Improve the report."' },
            { id: 'b', label: '"Summarize the report\'s risks section in three bullets for the exec meeting."' },
          ],
          correctId: 'b',
          explain: 'The second names the task, the scope, and the audience — a model needs the same three things.',
        },
      ],
    },
    {
      id: 'intro-precise',
      kind: 'content',
      blocks: [
        { kind: 'heading', text: 'The analogy, made precise' },
        {
          kind: 'paragraph',
          md: 'A prompt is the whole briefing: the **task**, the **constraints** (length, format, tone), and the **context** the model can\'t guess. Models don\'t read minds; they read tokens.',
        },
        {
          kind: 'callout',
          tone: 'tip',
          md: 'If a stranger couldn\'t do the task from your instructions alone, the model can\'t either.',
        },
        {
          kind: 'reveal',
          id: 'precise-reveal',
          prompt: 'Before revealing: what\'s missing from "Write a product description"?',
          md: 'The product, the audience, the length, and the tone. Try: "Write a 50-word description of this hiking backpack for a gear-review site, matter-of-fact tone."',
        },
      ],
    },
    {
      id: 'intro-fewshot',
      kind: 'content',
      blocks: [
        { kind: 'heading', text: 'Show, don\'t only tell' },
        {
          kind: 'paragraph',
          md: 'When the format matters, one or two worked examples in the prompt — *few-shot examples* — beat paragraphs of description. The model imitates the pattern.',
        },
        {
          kind: 'list',
          style: 'bullet',
          items: [
            'One example fixes the format.',
            'Two examples fix the format *and* the range.',
            'Ten examples mostly just cost tokens.',
          ],
        },
        {
          kind: 'mcq',
          id: 'fewshot-q',
          prompt: 'You need dates extracted as YYYY-MM-DD. The fastest reliable fix is…',
          options: [
            { id: 'a', label: 'Explain ISO 8601 in detail' },
            { id: 'b', label: 'Show one input → "2026-03-14" example pair' },
            { id: 'c', label: 'Ask it to "be careful with dates"' },
          ],
          correctId: 'b',
          explain: 'A single example pins the format more firmly than any description of it.',
        },
      ],
    },
    { id: 'intro-review', kind: 'review', blocks: null },
    {
      id: 'intro-summary',
      kind: 'summary',
      blocks: [
        {
          kind: 'paragraph',
          md: 'A useful prompt briefs like you\'d brief a stranger: task, constraints, context. When format matters, show a worked example instead of describing it.',
        },
      ],
    },
  ],
}

/** Strengthen · retrieval-quiz · targets the "How models predict text" goal. */
export const FIXTURE_DOC_STRENGTHEN: ActivityDoc = {
  version: 1,
  title: 'Quick retrieval: prediction and temperature',
  estMinutes: 5,
  tier: 'strengthen',
  libraryItemId: 'retrieval-quiz',
  concepts: [
    { goalConceptId: 'c-pred-nexttoken', label: 'Next-token prediction' },
    { goalConceptId: 'c-pred-temperature', label: 'Temperature and sampling' },
  ],
  pages: [
    {
      id: 'quiz-warmup',
      kind: 'content',
      blocks: [
        {
          kind: 'reveal',
          id: 'warmup',
          prompt: 'From memory: what is a language model actually computing at each step?',
          md: 'A probability for every token in its vocabulary — "given everything so far, how likely is each possible next token?" — then one of them is chosen.',
        },
      ],
    },
    {
      id: 'quiz-mixed',
      kind: 'content',
      blocks: [
        {
          kind: 'fillBlank',
          id: 'fb-temp',
          md: 'At temperature 0 the model always picks the ___ likely next token, so the same prompt gives (nearly) the same answer.',
          blanks: [{ id: 'b1', answer: 'most', alts: ['highest', 'most likely'] }],
        },
        {
          kind: 'ordering',
          id: 'ord-loop',
          prompt: 'Put one generation step in order:',
          items: [
            { id: 's1', label: 'Read the tokens so far' },
            { id: 's2', label: 'Score every possible next token' },
            { id: 's3', label: 'Sample one token from those scores' },
            { id: 's4', label: 'Append it and repeat' },
          ],
          correctOrder: ['s1', 's2', 's3', 's4'],
        },
        {
          kind: 'matching',
          id: 'match-temp',
          prompt: 'Match the temperature to the job:',
          pairs: [
            { leftId: 'l1', left: 'Low (≈0)', rightId: 'r1', right: 'Extracting fields from an invoice' },
            { leftId: 'l2', left: 'Medium (≈0.7)', rightId: 'r2', right: 'Drafting a friendly email' },
            { leftId: 'l3', left: 'High (≈1+)', rightId: 'r3', right: 'Brainstorming twenty campaign names' },
          ],
        },
      ],
    },
    {
      id: 'quiz-tricky',
      kind: 'content',
      blocks: [
        {
          kind: 'paragraph',
          md: 'The one people miss: sampling explains why a model can give **different answers to the same question** — that\'s a setting, not a malfunction.',
        },
        {
          kind: 'mcq',
          id: 'tricky-q',
          prompt: 'Your assistant gave two different summaries of the same document. The most likely explanation is…',
          options: [
            { id: 'a', label: 'It "remembered" the document differently' },
            { id: 'b', label: 'Temperature above 0 sampled a different token path' },
            { id: 'c', label: 'The document changed' },
          ],
          correctId: 'b',
          explain: 'Each run samples from the same probabilities; above temperature 0, different paths are expected.',
        },
      ],
    },
    { id: 'quiz-review', kind: 'review', blocks: null },
    {
      id: 'quiz-summary',
      kind: 'summary',
      blocks: [
        {
          kind: 'paragraph',
          md: 'Generation is a loop: score every next token, sample one, repeat. Temperature tunes how adventurous the sampling is — low for precision, higher for variety.',
        },
      ],
    },
  ],
}

/** Apply · in-the-wild · targets the "Context windows" goal; exercises resourceEmbed. */
export const FIXTURE_DOC_APPLY: ActivityDoc = {
  version: 1,
  title: 'Context limits, in the wild',
  estMinutes: 8,
  tier: 'apply',
  libraryItemId: 'in-the-wild',
  concepts: [
    { goalConceptId: 'c-ctx-window', label: 'Context window' },
    { goalConceptId: 'c-ctx-budget', label: 'Working within limits' },
  ],
  pages: [
    {
      id: 'wild-artifact',
      kind: 'content',
      blocks: [
        { kind: 'heading', text: 'The artifact' },
        {
          kind: 'paragraph',
          md: 'Read the short section "Lost in the middle" below — a real finding about how models use long contexts.',
        },
        {
          kind: 'resourceEmbed',
          url: 'https://arxiv.org/abs/2307.03172',
          media: 'article',
          title: 'Lost in the Middle: How Language Models Use Long Contexts',
          focus: 'Read the abstract only. Where in the context do models attend best — and worst?',
        },
        {
          kind: 'freeText',
          id: 'wild-notice',
          prompt: 'In one sentence: what did you find?',
          placeholder: 'Models are best at the start and end of the context…',
        },
      ],
    },
    {
      id: 'wild-lens',
      kind: 'content',
      blocks: [
        { kind: 'heading', text: 'The expert lens' },
        {
          kind: 'steps',
          items: [
            { label: 'Budget', md: 'Long context ≠ free context: everything you include competes for attention and costs tokens.' },
            { label: 'Position', md: 'Put the instruction and the most important material at the **start or end**, not buried in the middle.' },
            { label: 'Prune', md: 'Retrieval or summaries of the irrelevant 80% usually beat pasting everything.' },
          ],
        },
        {
          kind: 'resourceEmbed',
          url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
          media: 'video',
          title: 'Intro to LLMs — the context window segment',
          startSec: 1260,
          endSec: 1410,
          focus: 'Watch ~2 minutes: how does he describe the context window as the model\'s "working memory"?',
        },
        {
          kind: 'mcq',
          id: 'lens-check',
          prompt: 'You\'re pasting a 60-page contract to ask one question about clause 14. The expert move is…',
          options: [
            { id: 'a', label: 'Paste all 60 pages — more context is safer' },
            { id: 'b', label: 'Paste clause 14 (and its definitions), ask, and mention the rest exists' },
            { id: 'c', label: 'Paste pages 1–30 to stay under the limit' },
          ],
          correctId: 'b',
          explain: 'Selection beats volume: the relevant clause up front, the noise left out.',
        },
      ],
    },
    {
      id: 'wild-takeaway',
      kind: 'content',
      blocks: [
        {
          kind: 'freeText',
          id: 'takeaway',
          prompt: 'Your takeaway: name one real document you work with and how you\'d trim it before asking a model about it.',
        },
        {
          kind: 'selfRate',
          id: 'confidence',
          prompt: 'How confident are you deciding what goes into the context next time?',
          scale: [
            { id: '1', label: 'Still guessing' },
            { id: '2', label: 'Getting there' },
            { id: '3', label: 'Confident' },
          ],
        },
      ],
    },
    { id: 'wild-review', kind: 'review', blocks: null },
    {
      id: 'wild-summary',
      kind: 'summary',
      blocks: [
        {
          kind: 'paragraph',
          md: 'Context is a budget, not a bucket: select what matters, place it where attention is strongest, and leave the rest out.',
        },
      ],
    },
  ],
}

export const FIXTURE_ACTIVITY_DOCS = {
  introduce: FIXTURE_DOC_INTRODUCE,
  strengthen: FIXTURE_DOC_STRENGTHEN,
  apply: FIXTURE_DOC_APPLY,
} as const

/**
 * The fixture document for a tier, re-pointed at a real goal's concepts. The
 * hand-written docs carry the seed interest's concept ids, which belong to no
 * other goal — served as-is, fixture mode would fail its own validation
 * boundary for every interest but the seeded one.
 */
export function fixtureDocForGoal(
  tier: Tier,
  goalConcepts: readonly { id: string; label: string }[],
): ActivityDoc {
  const doc = FIXTURE_ACTIVITY_DOCS[tier]
  if (goalConcepts.length === 0) {
    return { ...doc, concepts: doc.concepts.map(({ label }) => ({ label })) }
  }
  return {
    ...doc,
    concepts: doc.concepts.map((concept, i) => {
      const target = goalConcepts[i]
      return target ? { goalConceptId: target.id, label: target.label } : { label: concept.label }
    }),
  }
}
