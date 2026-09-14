# 06 — Activity library (v1)

The library is the set of learning strategies activities are built from. It's a core open-source growth area: contributors can add items without touching the AI pipeline, because each item is a data definition consumed by G5a (selection) and G5b (structure).

Definition shape (`packages/core/library`):

```ts
type LibraryItem = {
  id: string
  name: string // shown in configure sheets
  sections: ('next' | 'strengthen' | 'go_further')[]
  overview: string // 1–2 sentences, shown in the info dialog
  pedagogy: string // why it works (for contributors + prompt context)
  pageSkeleton: string[] // ordered page intents G5b follows
  interactions: BlockKind[] // preferred interactive blocks
  defaultActive: boolean
  goodFor?: string // selection hint for G5a (domains/situations)
  flavor?: 'apply' | 'extend' // go_further items only
  outcomeLabel?: string // go_further items only — History wording (D1), e.g. "Put to use"
  usesResources?: boolean // item is built around a saved resource (video/article)
}
```

Selection: the scheduler picks the goal; G5a picks a library item from the active set for that section, using `goodFor` hints, the domain, variety (avoid repeating yesterday's item for the same goal), and — for `usesResources` items — whether a well-matched resource exists for the goal.

## Next (introduce)

| id                 | name                    | overview                                                                    | pedagogy                                                                                                                                                                              | skeleton                                                                                               |
| ------------------ | ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `plain-explainer`  | Plain-English Explainer | The idea explained through a familiar analogy, then made precise.           | Anchoring new ideas to prior knowledge; dual coding; low cognitive load. Default intro for abstract concepts.                                                                         | hook question → analogy → precise definition → quick check (mcq/reveal)                                |
| `worked-example`   | Worked Example          | Watch one concrete example unfold step by step, then try one step yourself. | Worked-example effect: novices learn more from studying steps than solving cold. Great for procedures, math-ish, language patterns.                                                   | setup → steps block → faded step (fillBlank/mcq) → recap                                               |
| `guided-discovery` | Guided Discovery        | Questions lead you to the idea before it gets a name.                       | Generation effect + productive struggle with tight scaffolding. Good for principles and "aha" concepts.                                                                               | scenario → 2–3 leading questions (mcq/freeText) → the reveal + naming → check                          |
| `mini-case`        | Mini Case               | A short real story that runs into the concept, then the debrief.            | Case-based learning; episodic memory hooks; shows why the concept matters. Good for strategy, finance, PM, climate.                                                                   | story → "what would you do" (mcq/freeText) → debrief → takeaway check                                  |
| `big-picture-map`  | Big Picture Map         | Where this idea sits in the landscape of the subject.                       | Advance organizers; schema building; reduces "lost in the middle" feeling. Good first activity of a new area.                                                                         | map/overview → locate the new idea (matching/ordering) → zoom into it → check                          |
| `watch-along`      | Watch Along             | Learn from a short, well-chosen video clip, with checkpoints.               | Multimedia learning: segmenting + embedded questions measurably beat passive watching. Uses a saved resource (`resourceEmbed`). Great for demos, technique, worked examples on video. | why this clip (focus prompt) → clip segment → checkpoint (mcq/freeText) → second segment → recap check |
| `guided-reading`   | Guided Reading          | Read a short article excerpt with a question in mind.                       | Elaborative interrogation + reading with purpose; comprehensible input for languages. Uses a saved resource.                                                                          | the question to hold → excerpt/link → what did you find (freeText/mcq) → connect to the concept        |

## Strengthen

| id                 | name                 | overview                                                           | pedagogy                                                                                                                                                                                             | skeleton                                                                                                                   |
| ------------------ | -------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `retrieval-quiz`   | Quick Retrieval      | A short mixed quiz from memory — the fastest way to make it stick. | Retrieval practice / testing effect; spacing when it revisits older goals. Default strengthen item.                                                                                                  | warm-up reveal → 3–5 mixed questions (mcq/fillBlank/ordering) → tricky-one revisit                                         |
| `explain-back`     | Explain It Back      | Explain the idea in your own words; get pointed feedback.          | Self-explanation + elaboration; G6 review page does the feedback.                                                                                                                                    | prompt recall (reveal) → freeText explain-back → apply to a twist (mcq)                                                    |
| `spot-the-error`   | Spot the Error       | Something's wrong in this example — find it.                       | Error-spotting builds discrimination and challenges illusions of fluency. Good for code, grammar, reasoning, chess.                                                                                  | flawed artifact → find/select the error (mcq/freeText) → why it's wrong → fixed version                                    |
| `compare-contrast` | Compare & Contrast   | Two ideas that are easy to mix up, side by side.                   | Discrimination learning; contrasting cases sharpen category boundaries.                                                                                                                              | the pair → sort features (matching) → edge case (mcq) → rule of thumb                                                      |
| `faded-example`    | Complete the Example | A worked example with missing steps — you fill the gaps.           | Fading: the bridge from studying examples to solving alone.                                                                                                                                          | recap of method → example with blanks (fillBlank) → full solution → reflection (selfRate)                                  |
| `mixed-review`     | Mixed Review         | Today's material woven together with earlier goals.                | Interleaving + spacing; harder, stickier. Unlocks once ≥3 goals are introduced.                                                                                                                      | 4–6 interleaved questions across goals → pattern debrief                                                                   |
| `focused-drill`    | Focused Drill        | Short, targeted reps on one specific weak point.                   | Deliberate practice: isolate a sub-skill just past comfort, immediate specific feedback each rep. Best for skill domains — languages, drawing, music, chess, coding.                                 | pick the weak point (from responses/history) → 3–5 tight reps (fillBlank/mcq/freeText) → feedback per rep → one harder rep |
| `notice-training`  | Noticing Reps        | Rapid-fire "what is this / which is better" classification reps.   | Perceptual learning (Kellman): many short classification trials with feedback build the expert's fast pattern recognition. Great for chess positions, art/composition, grammar forms, chart reading. | what to notice → 5–8 quick classify/compare reps (mcq/matching) → the pattern named → transfer rep                         |

## Go further

Two flavors (D1): **apply** — put learning to work; **extend** — go deeper or wider than the path required. Each item's `outcomeLabel` supplies the History wording: all apply items use "Put to use [goal]"; extend items say what actually happened — "Went deeper on [goal]" (Dig Deeper), "Branched out from [goal]" (Connect Ideas).

| id                   | name                     | overview                                                                                                  | pedagogy                                                                                          | skeleton                                                                                                             |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `put-to-work`        | Put It to Work           | Apply this to your own project, work, or life.                                                            | Transfer + relevance; uses the interest's contexts (projects/people/environments) when they fit.  | pick/confirm the context → plan the application (freeText) → pressure-test (mcq/reveal) → concrete next step         |
| `scenario-challenge` | Scenario Challenge       | A fresh situation; make the calls and see the consequences.                                               | Near-transfer practice with feedback; decisions > recognition.                                    | scenario → 2–3 decision points (mcq w/ consequences) → debrief → principle recap                                     |
| `teach-back`         | Teach It Forward         | Prepare how you'd explain this to a specific person.                                                      | Protégé effect; forces organization and gap-finding.                                              | choose audience → draft the explanation (freeText) → anticipate their question (freeText/mcq) → G6 feedback          |
| `make-something`     | Make Something Small     | A tiny creation with tight constraints — a sentence, sketch plan, budget line, opening repertoire choice. | Generation + production practice; constraints keep it 5-minute-sized.                             | the brief → make it (freeText) → self-check against criteria (selfRate) → one refinement                             |
| `in-the-wild`        | In the Wild              | Analyze something real — an article, chart, position, or one of your saved resources.                     | Perceptual learning and critique; connects learning to the world; uses `resources` when relevant. | the artifact (link/excerpt) → what do you notice (freeText/mcq) → expert lens → your takeaway                        |
| `dig-deeper`         | Dig Deeper _(extend)_    | The nuance the introduction skipped: edge cases, exceptions, the "it depends".                            | Desirable difficulty + refining mental models beyond the first-pass simplification.               | the simplified version recalled (reveal) → the complication → wrestle with it (mcq/freeText) → revised rule of thumb |
| `connect-ideas`      | Connect Ideas _(extend)_ | Tie this goal to another goal, interest, or adjacent field.                                               | Elaboration + far transfer; building a connected schema rather than islands.                      | the two ideas → find the bridge (freeText/matching) → a case where the connection pays off → takeaway                |

Items `put-to-work`, `scenario-challenge`, `teach-back`, `make-something`, `in-the-wild` are flavor **apply**; `dig-deeper`, `connect-ideas` are flavor **extend**.

All items `defaultActive: true` except `mixed-review` (activates once ≥3 goals introduced) and `big-picture-map` (auto-preferred for a path's first goal, otherwise occasional).

## Resources in activities

Resources aren't only Go further material — they're first-class in every section:

- **Next**: `watch-along` and `guided-reading` introduce a concept through a curated clip or excerpt instead of generated prose — often better than anything we'd write, especially for visual/procedural material.
- **Strengthen**: follow along a worked example on video with checkpoints (`watch-along` at strengthen tier), or `notice-training`/`focused-drill` reps built on a resource's examples.
- **Go further**: `in-the-wild` critique of a real artifact or saved resource.

Mechanics: G5a prefers `usesResources` items when a resource matches the goal well (via `resources.goal_ids` and summaries); G5b receives the matched resource's summary and builds the activity around it with `resourceEmbed` blocks — segmented, never "watch this 20-minute video", always paired with interaction.

## Domain-specific guidance

The library is domain-general; G5a/G5b selection and authoring lean on these per-domain emphases (encoded in `prompts/pedagogy.ts`, informed by G1's domain classification):

- **Languages**: heavy comprehensible input (`guided-reading`, `watch-along` with level-appropriate material) _plus_ pushed output (`focused-drill`, `explain-back`, `make-something` — produce sentences, not just recognize them). Input alone is necessary but not sufficient for adults.
- **Creative & physical skills** (drawing, music, cooking): deliberate practice loops — isolate one sub-skill, rep it just past comfort, immediate specific feedback (`focused-drill`), study references (`notice-training`, `watch-along`), then make (`make-something`) with a critique pass.
- **Strategy games** (chess): pattern recognition through many short classification reps (`notice-training`), tactics drills (`focused-drill`, `spot-the-error`), annotated study (`watch-along`, `in-the-wild`).
- **Quantitative/technical** (finance, LLMs, coding): worked examples → faded examples → retrieval, honoring the expertise-reversal effect (fade scaffolding as experience grows per the intake's experience level).
- **Knowledge-rich domains** (climate, PM, history): elaboration and cases (`mini-case`, `compare-contrast`, `connect-ideas`), retrieval with feedback, applying frameworks to real situations (`scenario-challenge`).

## Research grounding

The library leans on well-replicated findings: retrieval practice/testing effect and spaced practice (the two most effective techniques in large meta-analyses, amplified by corrective feedback), interleaving, worked-example and fading effects, self-explanation/elaboration, generation effect, deliberate practice (isolated sub-skills + immediate specific feedback), perceptual learning modules (Kellman), multimedia learning principles for video (segmenting, embedded questions — Mayer), and comprehensible input + output for language acquisition. Starting points: [Nature Reviews Psychology on spacing & retrieval](https://www.nature.com/articles/s44159-022-00089-1), [evidence-based strategies review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10368606/), [deliberate practice](https://pmc.ncbi.nlm.nih.gov/articles/PMC6824411/), [perceptual learning modules](https://onlinelibrary.wiley.com/doi/full/10.1111/j.1756-8765.2009.01053.x), [embedded questions in video](https://journals.aps.org/prper/abstract/10.1103/PhysRevPhysEducRes.18.010148), [instructional video design](https://www.sciencedirect.com/science/article/abs/pii/S2211368121000231), [Krashen, Principles and Practice](https://sdkrashen.com/content/books/principles_and_practice.pdf).

## Contribution notes

New items need: honest pedagogy grounding (cite the effect/principle), a skeleton expressible in existing block types (or a paired block-type proposal), and a `goodFor` hint. Items should produce activities completable in one session length. Keep names concrete and adult — no cutesy naming.
