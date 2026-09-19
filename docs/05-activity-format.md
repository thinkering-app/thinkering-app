# 05 — Activity Document format

Activities are **data, not code** (D5): a versioned JSON document emitted by G5b (via tool-use/structured output), validated with Zod, stored on `activities.doc`, and rendered by the native block renderer in `apps/mobile/src/features/activity-player`. The same document renders on iOS, Android, and web.

## Document shape

```ts
type ActivityDoc = {
  version: 1
  title: string
  estMinutes: number
  tier: 'introduce' | 'strengthen' | 'apply'
  libraryItemId: string
  concepts: { goalConceptId?: string; label: string }[] // goal concepts/skills targeted (D16); id links to the goal's concept for coverage
  pages: Page[]
}

type Page =
  | { id: string; kind: 'content'; blocks: Block[] }
  | { id: string; kind: 'review'; blocks: Block[] | null } // reserved; filled by G6
  | { id: string; kind: 'summary'; blocks: Block[] } // last page; renderer appends rating UI
  | { id: string; kind: 'inserted'; blocks: Block[] } // created by G7 (Ask)
```

Rules: 3–7 pages for a 5-minute session, scaling with `estMinutes`. Exactly one `review` page (second-to-last) and one `summary` page (last). Every non-summary page includes at least one interactive block. The renderer owns the progress bar (pages = segments; inserted pages extend it), back/forward navigation, and the always-visible Ask button — which sits in the navigation footer beside Back/Continue, in thumb reach, not in the header.

## Block types (v1)

Content:

- `heading { text }`
- `paragraph { md }` — inline markdown subset: bold, italic, code
- `list { style: bullet|numbered, items: md[] }`
- `callout { tone: note|example|tip, md }` — rendered as a tinted card
- `steps { items: {label, md}[] }` — worked-example step sequence
- `resourceEmbed { resourceId?, url, media: video|article, title, startSec?, endSec?, focus?: md }` — the field is `media` (not `kind`) because `kind` is the block discriminator — embeds a resource: YouTube inline player (WebView on iOS/Android; the web export has no WebView, so it degrades to a link card) optionally clipped to a segment; articles as a titled link card with an excerpt/focus prompt. Per multimedia-learning research, G5b segments videos (short clips, not whole videos) and pairs each embed with an interactive block (embedded questions), and `focus` tells the learner what to watch/read for before they start. Embeds are grounded in the learner's saved resources after validation (`groundPages`/`groundBlocks`, including streamed partials and Ask pages): one that matches a saved resource gets its `resourceId`, and the media its URL supports; one that matches none keeps its link but becomes `media: article`. Only a single YouTube video plays inline; a channel, playlist or any other URL renders as a link card, whatever `media` says.

Interactive (all record into `responses`):

- `mcq { prompt, options: {id, label}[], correctId?, explain?: md }` — instant feedback when `correctId` present; opinion-style when absent
- `freeText { prompt, placeholder?, minimal?: boolean }` — reflection / explain-back
- `fillBlank { md, blanks: {id, answer, alts?: string[]}[] }`
- `ordering { prompt, items: {id, label}[], correctOrder: id[] }`
- `matching { prompt, pairs: {leftId, left, rightId, right}[] }`
- `reveal { prompt, md }` — think-then-tap-to-reveal (retrieval practice)
- `selfRate { prompt, scale: {id, label}[] }` — confidence / self-assessment

Renderer contract: unknown block kinds render as a graceful "update the app" placeholder (forward compatibility); `version` gates breaking changes.

## Behavior

- **Responses** save immediately on interaction (`responses` table) — no submit buttons where avoidable.
- **Review page (G6)**: fires when the user moves past the last page holding an interactive block before the review page. Picks the single highest-value thing to address in their responses: a misconception to correct (kindly, directly), a good answer to build on, or an implicit question to answer. If responses were sparse, it reinforces the trickiest concept instead.
- **Summary page**: G5b provides the concept recap blocks; the renderer appends the standard rating row (👎 / mixed / 👍 + optional text) which writes to `activities.rating`, plus the quiet per-activity "share with the developers" action (D18, see `08`).
- **Ask (G7)**: inserts an `inserted` page after the current index and jumps to it. Multiple asks allowed; each extends the doc (persisted, so it survives resume).
- **Completion**: reaching the summary and tapping done → `status = completed`, `completed_at` set, goal status transition applied, section completion state updates on Today.
- **Resume**: `current_page` persists; an unfinished activity (started or not) stays on Today across days until it's finished — no expiry, no guilt UI. A new day clears only the finished ones.

## Authoring guidance baked into G5b prompts

- Respect the library item's structure (see `06-library.md` — each item specifies a page skeleton).
- Interaction before explanation where the strategy calls for it (generation effect); explanation before practice for worked examples. Keep cognitive load low: one idea per page.
- Ground apply-tier activities in the user's `contexts` and `resources` only when they genuinely fit.
- Concrete examples over abstractions; adult tone; zero filler ("Great job!" only when the answer was actually good, and specific about why).
