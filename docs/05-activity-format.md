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
  | { id: string; kind: 'inserted'; question?: string; blocks: Block[] } // created by G7 (Ask)
```

Rules: 3–7 pages for a 5-minute session, scaling with `estMinutes`. Exactly one `review` page (second-to-last) and one `summary` page (last). Every non-summary page includes at least one interactive block. The renderer owns the progress bar (pages = segments; inserted pages extend it), back/forward navigation, and the always-visible Ask button — which sits in the navigation footer beside Back/Continue, in thumb reach, not in the header.

## Block types (v1)

Content:

- `heading { text }`
- `paragraph { md }` — inline markdown subset: bold, italic, code
- `list { style: bullet|numbered, items: md[] }`
- `callout { tone: note|example|tip, md }` — rendered as a tinted card
- `steps { items: {label, md}[] }` — worked-example step sequence
- `resourceEmbed { resourceId?, url, media: video|article, title, startSec?, endSec?, focus?: md }` — the field is `media` (not `kind`) because `kind` is the block discriminator — `url` must be `http(s)` (docs/04 §Untrusted text) — embeds a resource: YouTube inline player (WebView on iOS/Android; the web export has no WebView, so it degrades to a link card) optionally clipped to a segment; articles as a titled link card with an excerpt/focus prompt. Per multimedia-learning research, G5b segments videos (short clips, not whole videos) and pairs each embed with an interactive block (embedded questions), and `focus` tells the learner what to watch/read for before they start. Embeds are grounded in the learner's saved resources after validation (`groundPages`/`groundBlocks`, including streamed partials and Ask pages): one that matches a saved resource gets its `resourceId`, and the media its URL supports; one that matches none keeps its link but becomes `media: article`. Only a single YouTube video plays inline; a channel, playlist or any other URL renders as a link card, whatever `media` says.

Interactive (all record into `responses`):

- `mcq { prompt, options: {id, label}[], correctId?, explain?: md }` — instant feedback when `correctId` present; opinion-style when absent
- `freeText { prompt, placeholder?, minimal?: boolean, consider?: md }` — reflection / explain-back. `consider` is one sentence that gives a stuck learner a way in without giving the answer; it stays hidden behind a "Think about…" pill under the field. G5b writes one for every freeText; G7 pages and older documents may not have one, and then there's no pill.
- `fillBlank { md, blanks: {id, answer, alts?: string[]}[] }` — each answer follows from what the activity already taught, and nothing else on the page gives it away; a wrong answer is shown once the learner leaves the blank. Grading forgives case, spacing, hyphens, punctuation at either end, thousands commas, an article only one side has, and one typo in an answer of eight letters or more without digits (`gradeBlank`)
- `ordering { prompt, items: {id, label}[], correctOrder: id[] }` — items start shuffled; the learner arranges them and presses **Check**, which saves and grades the order
- `matching { prompt, pairs: {leftId, left, rightId, right}[] }` — the right column starts shuffled
- `reveal { prompt, md }` — think-then-tap-to-reveal (retrieval practice)
- `selfRate { prompt, scale: {id, label}[] }` — confidence / self-assessment

The model writes ordering items and matching pairs already solved, so the renderer shuffles them (`displayOrder`), seeded from the page and block ids so a block lays out the same way on resume, and never solved.

Renderer contract: unknown block kinds render as a graceful "update the app" placeholder (forward compatibility); `version` gates breaking changes.

## Behavior

- **Responses** save immediately on interaction (`responses` table) — no submit buttons where avoidable. Ordering is the exception: an order is only an answer once it's finished, so it waits for **Check**.
- **Review page (G6)**: fires when the user moves past the last page holding an interactive block before the review page. Picks the single highest-value thing to address in their responses: a misconception to correct (kindly, directly), a good answer to build on, or an implicit question to answer. If responses were sparse, it reinforces the trickiest concept instead. It is one paragraph, under 45 words, addressing that one thing only — not each answer in turn, and not a wrap-up of the session. Prose only: no heading, no list, no interaction. `checkReviewBlocks` asserts the shape, and flags length past 65 words — above the ask, so it catches a slide back to a lesson rather than a paragraph a few words over.
- **Summary page**: the renderer opens it with a short celebration line (picked from a fixed list, stable per activity) and a line naming the goal — "You learned / strengthened / went further on <goal title>." by tier, or the topic for a prerequisite card; the words live in `features/activity-player/summary-copy.ts` — and a small arrival animation per section (`07`), then G5b's concept recap — under 50 words and no heading of its own, either one paragraph or a bullet per idea the activity covered — then the concept chips. At the foot of the page, centered: the standard rating row (👎 / 👍👎 mixed / 👍) which writes to `activities.rating`, an optional note, and a **Send** button that shares the activity, rating and note with the developers — never the learner's answers (D18, see `08`).
- **Ask (G7)**: a speech-bubble button in the navigation row on every page, and an "Ask a question" pill under each `freeText` answer; both open the same sheet. It inserts an `inserted` page after the current index and jumps to it. The page keeps the `question` it answers, and the renderer puts it above the blocks ("You asked"), so the page still reads as a reply on resume rather than as a page that came out of nowhere. Multiple asks allowed; each extends the doc (persisted, so it survives resume). The field is optional: pages inserted before it was recorded are still valid. It never leaves the device: a shared activity report goes through `docForReport`, which takes it back out (`08`).
- **Merging late generations.** G6 and G7 both resolve seconds after they start, from a document that has since moved. Each returns blocks, and the route merges them into the document as it stands and persists that — never the snapshot the call began with. Replacing the document wholesale drops whatever else landed meanwhile: a G6 call started before an Ask would take the Ask page back out, from the screen and from `activities.doc`, dumping the learner on whatever page had slid into their index.
- **Completion**: reaching the summary and tapping done → `status = completed`, `completed_at` set, goal status transition applied, section completion state updates on Today.
- **Resume**: `current_page` persists; an unfinished activity (started or not) stays on Today across days until it's finished — no expiry, no guilt UI. A new day clears only the finished ones.

## Authoring guidance baked into G5b prompts

- Respect the library item's structure (see `06-library.md` — each item specifies a page skeleton).
- Interaction before explanation where the strategy calls for it (generation effect); explanation before practice for worked examples. Keep cognitive load low: one idea per page.
- Ground apply-tier activities in the user's `contexts` and `resources` only when they genuinely fit.
- Concrete examples over abstractions; adult tone; zero filler ("Great job!" only when the answer was actually good, and specific about why).
