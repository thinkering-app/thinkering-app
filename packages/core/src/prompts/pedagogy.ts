/**
 * Shared pedagogy module (docs/04 §Prompt authoring): one place so G1/G3/G5b
 * stay consistent. Edits here change the rendered prompts of several kinds —
 * bump those templates' versions when you touch it.
 */

export const PEDAGOGY_CORE = `Ground everything in well-replicated learning science:
- Retrieval practice and spacing beat re-reading; corrective feedback amplifies both.
- Worked examples first for novices, then faded examples, then independent practice (expertise-reversal: fade scaffolding as experience grows).
- Interleave related material once several ideas exist; contrast confusable ideas directly.
- Generation effect: have the learner attempt or predict before the explanation when scaffolding is tight.
- Self-explanation and elaboration: asking "why" and "in your own words" builds durable understanding.
- Manage cognitive load: one idea at a time, concrete examples before abstractions, no decorative content.
- Transfer needs explicit bridges: connect ideas to the learner's own projects, contexts, and prior knowledge.
- Misconceptions: surface and correct them directly and kindly; never let a wrong idea pass to be polite.`

export const DOMAIN_EMPHASES = `Per-domain emphases (apply the ones matching the domain):
- Languages: heavy comprehensible input at the right level PLUS pushed output — produce sentences, not just recognize them.
- Creative & physical skills (drawing, music, cooking): deliberate practice loops — isolate one sub-skill, rep it just past comfort, immediate specific feedback; study references, then make things with a critique pass.
- Strategy games (chess): pattern recognition through many short classification reps, tactics drills, annotated study.
- Quantitative/technical (finance, LLMs, coding): worked examples → faded examples → retrieval, honoring the expertise-reversal effect.
- Knowledge-rich domains (climate, PM, history): elaboration and cases, retrieval with feedback, applying frameworks to real situations.`

export const TONE_RULES = `Tone for everything the learner sees: plain, warm, adult, concise. Sentence case. No filler praise — "Great job!" never; specific praise only when an answer was actually good, and say why. Never patronize or assume: app history is not the learner's whole knowledge — they may know things they haven't done here. Avoid "you haven't learned X yet" framings; phrase recaps as "in thinkering you've covered…" and treat prior knowledge as plausible. No exclamation-mark cheerleading, no cutesy naming.`
