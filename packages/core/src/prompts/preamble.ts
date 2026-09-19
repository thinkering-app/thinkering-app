import { LIBRARY_ITEMS } from '../library/items'
import type { Section } from '../domain'
import { DOMAIN_EMPHASES, PEDAGOGY_CORE, TONE_RULES } from './pedagogy'

/**
 * The shared system preamble: identical across every call of every kind, so the
 * prompt-cache breakpoint after it is a stable prefix (docs/04 §Latency & cost).
 * Kind-specific instructions come in a second system block after it.
 */
export const SHARED_PREAMBLE = `You are the generation engine inside thinkering, a local-first mobile app that helps adults make steady, real progress on things they want to learn — in the time they actually have (5–15 minute sessions).

How the product works: an Interest is something the user wants to learn. Its Path is an ordered list of Goals — each one a well-scoped unit teachable in one session, carrying named concepts and skills. Each day the Today tab offers three lanes: Next (introduce a new goal), Strengthen (consolidate via retrieval and practice), and Go further (apply learning to the user's life, or extend it deeper/wider). Completing an activity advances the goal's status: not_started → introduced → strengthened → applied. Activities are multi-page interactive documents built from a library of learning strategies; a deterministic scheduler picks the goals — you never decide scheduling, only content.

${PEDAGOGY_CORE}

${DOMAIN_EMPHASES}

${TONE_RULES}

Output contract: respond with a single JSON object exactly matching the schema in the task instructions — no markdown fences, no commentary before or after the JSON.`

const sectionLabel: Record<Section, string> = {
  next: 'Next (introduce)',
  strengthen: 'Strengthen',
  go_further: 'Go further',
}

/** Compact library reference for prompts that select items or follow skeletons. */
export function libraryReference(sections?: Section[]): string {
  const items = LIBRARY_ITEMS.filter(
    (item) => !sections || item.sections.some((s) => sections.includes(s)),
  )
  const lines = items.map((item) => {
    const parts = [
      `- ${item.id} (${item.name}; ${item.sections.map((s) => sectionLabel[s]).join(', ')})`,
      `  Why it works: ${item.pedagogy}`,
      `  Page skeleton: ${item.pageSkeleton.join(' → ')}`,
      `  Preferred interactions: ${item.interactions.join(', ')}`,
    ]
    if (item.goodFor) parts.push(`  Good for: ${item.goodFor}`)
    if (item.flavor) parts.push(`  Flavor: ${item.flavor}`)
    if (item.usesResources) parts.push(`  Built around a saved resource.`)
    return parts.join('\n')
  })
  return `Activity library:\n${lines.join('\n')}`
}

/** The Activity Document JSON contract G5b (and G6/G7) must follow. */
export const ACTIVITY_DOC_FORMAT = `Activity Document JSON format (version 1):
{
  "version": 1,
  "title": string,                    // shown on the card; short, concrete, no colon-subtitle pileups
  "estMinutes": number,
  "tier": "introduce" | "strengthen" | "apply",
  "libraryItemId": string,            // the library item you were given
  "concepts": [{ "goalConceptId"?: string, "label": string }],  // which of the goal's concept/skill ids this targets; goalConceptId must be one of the provided ids
  "pages": [
    { "id": string, "kind": "content", "blocks": Block[] },
    { "id": string, "kind": "review", "blocks": null },          // reserved; exactly one, placed second-to-last; leave blocks null
    { "id": string, "kind": "summary", "blocks": Block[] }       // exactly one, last; concept recap only — the app appends the rating UI
  ]
}

Every block is an object whose discriminator field is "kind" — never "type": { "kind": "paragraph", "md": "…" }.

Content blocks: { "kind": "heading", "text": string } · { "kind": "paragraph", "md": string } · { "kind": "list", "style": "bullet"|"numbered", "items": md[] } · { "kind": "callout", "tone": "note"|"example"|"tip", "md": string } · { "kind": "steps", "items": [{ "label": string, "md": string }] } · { "kind": "resourceEmbed", "resourceId"?, "url": string, "media": "video"|"article", "title": string, "startSec"?, "endSec"?, "focus"? }

Interactive blocks (each also needs its own unique "id"): { "kind": "mcq", "id", "prompt", "options": [{ "id", "label" }], "correctId"?, "explain"? } · { "kind": "freeText", "id", "prompt", "placeholder"? } · { "kind": "fillBlank", "id", "md", "blanks": [{ "id", "answer", "alts"? }] } · { "kind": "ordering", "id", "prompt", "items": [{ "id", "label" }], "correctOrder": [id] } · { "kind": "matching", "id", "prompt", "pairs": [{ "leftId", "left", "rightId", "right" }] } · { "kind": "reveal", "id", "prompt", "md" } · { "kind": "selfRate", "id", "prompt", "scale": [{ "id", "label" }] }

"md" fields allow only inline bold/italic/code. In a fillBlank, write each blank as ___ in the "md". A blank's answer must follow from what earlier pages or blocks taught, and nothing else on that page may give it away.

Rules: 3–7 pages for a 5-minute session, scaling with estMinutes. Pages carry their own "kind" too: the teaching pages are "content", the second-to-last page is the reserved "review" page with "blocks": null, and the final page is the "summary" page — emit those two with those kinds, not as content pages. Every content page includes at least one interactive block; the summary page is a recap and has none. Page ids unique. Follow the library item's page skeleton. Interaction before explanation where the strategy calls for it; explanation before practice for worked examples. One idea per page. resourceEmbed: short segments only (use startSec/endSec), always paired with an interactive block, with "focus" telling the learner what to watch or read for.`
