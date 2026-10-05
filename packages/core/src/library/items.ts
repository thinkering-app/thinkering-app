import type { LibraryItem } from './types'

/**
 * The v1 activity library (docs/06-library.md). Order within a section is the
 * display order in configure sheets.
 */
export const LIBRARY_ITEMS: LibraryItem[] = [
  // ── Next (introduce) ──────────────────────────────────────────────────────
  {
    id: 'plain-explainer',
    name: 'Plain-English Explainer',
    sections: ['next'],
    overview: 'Meet the idea through an everyday comparison, then pin it down.',
    whyItHelps: 'Linking something new to something you know makes it easier to hold onto.',
    pedagogy:
      'Anchoring new ideas to prior knowledge; dual coding; low cognitive load. Default intro for abstract concepts.',
    pageSkeleton: ['hook question', 'analogy', 'precise definition', 'quick check'],
    interactions: ['mcq', 'reveal'],
    defaultActive: true,
    goodFor: 'abstract concepts in any domain',
  },
  {
    id: 'worked-example',
    name: 'Worked Example',
    sections: ['next'],
    overview: 'Follow one example step by step, then do a step yourself.',
    whyItHelps:
      "Studying a solved example teaches a method faster than working it out cold, especially when you're starting out.",
    pedagogy:
      'Worked-example effect: novices learn more from studying steps than solving cold. Self-explanation prompts — "why this step?" — make the example teach more than reading it (Renkl; Atkinson, Renkl & Merrill 2003). A long procedure groups its steps so each page holds one idea. Great for procedures, math-ish, language patterns.',
    pageSkeleton: [
      'setup',
      'the solution a step at a time, with a quick "why this step?" check on the key steps',
      'one step done by the learner',
      'recap',
    ],
    interactions: ['mcq', 'fillBlank'],
    defaultActive: true,
    goodFor: 'procedures, quantitative material, language patterns',
  },
  {
    id: 'guided-discovery',
    name: 'Guided Discovery',
    sections: ['next'],
    overview: 'Answer a few questions that lead you to the idea yourself.',
    whyItHelps: "Working something out before it's named makes it more memorable.",
    pedagogy:
      'Generation effect + productive struggle with tight scaffolding. Good for principles and "aha" concepts.',
    pageSkeleton: ['scenario', '2–3 leading questions', 'the reveal + naming', 'check'],
    interactions: ['mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'principles and "aha" concepts',
  },
  {
    id: 'mini-case',
    name: 'Mini Case',
    sections: ['next'],
    overview: "Read a short real story, decide what you'd do, then debrief.",
    whyItHelps: 'A story shows why an idea matters and gives your memory a hook.',
    pedagogy:
      'Case-based learning; episodic memory hooks; shows why the concept matters. Good for strategy, finance, PM, climate, and judgement calls with people.',
    pageSkeleton: ['story', '"what would you do"', 'debrief', 'takeaway check'],
    interactions: ['mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'judgement in context — strategy, finance, product management, leading people',
  },
  {
    id: 'big-picture-map',
    name: 'Big Picture Map',
    sections: ['next'],
    overview: 'See where this idea fits in the subject as a whole.',
    whyItHelps: 'Knowing the shape of a subject makes each new piece easier to place.',
    activation: 'On by default until you start your first goal.',
    pedagogy:
      'Advance organizers; schema building; reduces "lost in the middle" feeling. Good first activity of a new area.',
    pageSkeleton: ['map/overview', 'locate the new idea', 'zoom into it', 'check'],
    interactions: ['matching', 'ordering'],
    // Auto-preferred for a path's first goal, otherwise occasional (docs/06).
    defaultActive: false,
    goodFor: "a path's first goal or the start of a new area",
  },
  {
    id: 'watch-along',
    name: 'Watch Along',
    sections: ['next', 'strengthen'],
    overview: 'Watch a short video clip with questions along the way.',
    whyItHelps: 'Pausing to answer questions turns watching into learning.',
    pedagogy:
      'Multimedia learning: segmenting + embedded questions measurably beat passive watching. Uses a saved resource (resourceEmbed). Great for demos, technique, worked examples on video.',
    pageSkeleton: [
      'why this clip (focus prompt)',
      'clip segment',
      'checkpoint',
      'second segment',
      'recap check',
    ],
    interactions: ['mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'seeing a skill done well — demos, technique, talks, worked examples on video',
    usesResources: true,
    resourceMedia: 'video',
  },
  {
    id: 'guided-reading',
    name: 'Guided Reading',
    sections: ['next'],
    overview: 'Read a short excerpt with one question in mind.',
    whyItHelps: 'Reading with a purpose helps you notice and keep what matters.',
    pedagogy:
      'Elaborative interrogation + reading with purpose; comprehensible input for languages. Uses a saved resource.',
    pageSkeleton: [
      'the question to hold',
      'excerpt/link',
      'what did you find',
      'connect to the concept',
    ],
    interactions: ['freeText', 'mcq'],
    defaultActive: true,
    goodFor: 'knowledge-rich domains, language comprehensible input',
    usesResources: true,
    resourceMedia: 'article',
  },

  // ── Strengthen ────────────────────────────────────────────────────────────
  {
    id: 'retrieval-quiz',
    name: 'Quick Retrieval',
    sections: ['strengthen'],
    overview: 'Answer a few quick questions from memory.',
    whyItHelps: 'Pulling something from memory is what makes it stick.',
    pedagogy:
      'Retrieval practice / testing effect; spacing when it revisits older goals. The strengthen choice for concepts, facts and vocabulary; a skill strengthens through reps instead.',
    pageSkeleton: ['warm-up reveal', '3–5 mixed questions', 'tricky-one revisit'],
    interactions: ['mcq', 'fillBlank', 'ordering'],
    defaultActive: true,
    goodFor: 'concepts, facts and vocabulary worth recalling',
  },
  {
    id: 'explain-back',
    name: 'Explain It Back',
    sections: ['strengthen'],
    overview: 'Explain the idea in your own words and get feedback.',
    whyItHelps: "Putting it in your own words shows what you understand and what's missing.",
    pedagogy: 'Self-explanation + elaboration; G6 review page does the feedback.',
    pageSkeleton: ['prompt recall (reveal)', 'freeText explain-back', 'apply to a twist'],
    interactions: ['reveal', 'freeText', 'mcq'],
    defaultActive: true,
    goodFor: 'conceptual material where fluent recall matters',
  },
  {
    id: 'spot-the-error',
    name: 'Spot the Error',
    sections: ['strengthen'],
    overview: "Find what's wrong in an example, then fix it.",
    whyItHelps: 'Catching mistakes sharpens your sense of what right looks like.',
    pedagogy:
      'Error-spotting builds discrimination and challenges illusions of fluency. Good for code, grammar, reasoning, chess, and for weak work to improve: vague feedback, a muddled slide, a clunky level.',
    pageSkeleton: ['flawed artifact', 'find/select the error', "why it's wrong", 'fixed version'],
    interactions: ['mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'code, grammar, reasoning, chess; a flawed draft, message or design to fix',
  },
  {
    id: 'compare-contrast',
    name: 'Compare & Contrast',
    sections: ['strengthen'],
    overview: 'Put two easily confused ideas side by side.',
    whyItHelps: 'Seeing exactly where two ideas differ keeps you from mixing them up.',
    pedagogy: 'Discrimination learning; contrasting cases sharpen category boundaries.',
    pageSkeleton: ['the pair', 'sort features', 'edge case', 'rule of thumb'],
    interactions: ['matching', 'mcq'],
    defaultActive: true,
    goodFor: 'commonly confused concepts',
  },
  {
    id: 'faded-example',
    name: 'Complete the Example',
    sections: ['strengthen'],
    overview: 'Fill in the missing steps of a worked example.',
    whyItHelps: "It's the bridge between following a method and using it on your own.",
    pedagogy: 'Fading: the bridge from studying examples to solving alone.',
    pageSkeleton: ['recap of method', 'example with blanks', 'full solution', 'reflection'],
    interactions: ['fillBlank', 'selfRate'],
    defaultActive: true,
    goodFor: 'procedures and quantitative material after a worked example',
  },
  {
    id: 'mixed-review',
    name: 'Mixed Review',
    sections: ['strengthen'],
    overview: 'Answer questions that mix recent material with earlier goals.',
    whyItHelps: "Switching between topics is harder, and that's what makes it last.",
    activation: "Turns on by itself once you've started two goals.",
    pedagogy: 'Interleaving + spacing; harder, stickier. Unlocks once ≥2 goals are introduced.',
    pageSkeleton: ['4–6 interleaved questions across goals', 'pattern debrief'],
    interactions: ['mcq', 'fillBlank', 'matching'],
    // Locked until ≥2 goals are introduced (prefs.ts, docs/06).
    defaultActive: false,
    goodFor: 'paths with ≥2 introduced goals',
  },
  {
    id: 'focused-drill',
    name: 'Focused Drill',
    sections: ['strengthen'],
    overview: 'Do short, targeted practice on one weak spot.',
    whyItHelps:
      'Practicing just past your comfort zone, with feedback each time, builds skill fastest.',
    pedagogy:
      'Deliberate practice: isolate a sub-skill just past comfort, immediate specific feedback each rep. Best for skills you do — languages, chess, coding, drawing, and the words for a hard conversation or a tough question. A written rep (freeText) is followed by a model answer to compare against (reveal), so each rep gets feedback on the page.',
    pageSkeleton: [
      'pick the weak point — from earlier reviews on this goal, or a slip common at their level',
      '3–5 tight reps, each checked or compared with a model answer',
      'one harder rep',
    ],
    interactions: ['freeText', 'reveal', 'fillBlank', 'mcq'],
    defaultActive: true,
    goodFor:
      'skills you do — grammar and word-form patterns, code, chess, drawing; what to say in a hard conversation, a pitch or an answer under pressure',
  },
  {
    id: 'notice-training',
    name: 'Noticing Reps',
    sections: ['strengthen'],
    overview: 'Sort quick examples to train your eye for patterns.',
    whyItHelps: "Many fast, checked judgments build an expert's instant recognition.",
    pedagogy:
      "Perceptual learning (Kellman): many short classification trials with feedback build the expert's fast pattern recognition. Great for chess positions, art/composition, grammar forms, chart reading.",
    pageSkeleton: [
      'what to notice',
      '5–8 quick classify/compare reps',
      'the pattern named',
      'transfer rep',
    ],
    interactions: ['mcq', 'matching'],
    defaultActive: true,
    goodFor:
      'chess positions, art/composition, grammar forms, chart reading; telling a strong opening, answer or level design from a weak one',
  },

  // ── Go further ────────────────────────────────────────────────────────────
  {
    id: 'put-to-work',
    name: 'Put It to Work',
    sections: ['go_further'],
    overview: 'Plan one real try at this in your own project, work or life.',
    whyItHelps: 'Using an idea somewhere real is how it becomes yours.',
    pedagogy:
      "Transfer + relevance; implementation intentions (when, where, what you'll do) make a real attempt likelier. Uses the interest's contexts (projects/people/environments) when they fit.",
    pageSkeleton: [
      'pick the real moment — a meeting, a conversation, a build session',
      'plan the attempt: what you will do or say',
      'pressure-test: what might go differently',
      'how you will know it worked',
    ],
    interactions: ['freeText', 'mcq', 'reveal'],
    defaultActive: true,
    goodFor:
      'anything practiced in real life — leading, presenting, conversation, a project of their own',
    flavor: 'apply',
    outcomeLabel: 'Put to use',
  },
  {
    id: 'scenario-challenge',
    name: 'Scenario Challenge',
    sections: ['go_further'],
    overview: 'Make decisions in a new situation and see what follows.',
    whyItHelps: 'Making the calls yourself, not just picking answers, prepares you for real ones.',
    pedagogy: 'Near-transfer practice with feedback; decisions > recognition.',
    pageSkeleton: ['scenario', '2–3 decision points', 'debrief', 'principle recap'],
    interactions: ['mcq', 'freeText'],
    defaultActive: true,
    goodFor:
      'decisions and live situations — strategy, finance, PM, leading, negotiating, handling questions',
    flavor: 'apply',
    outcomeLabel: 'Put to use',
  },
  {
    id: 'teach-back',
    name: 'Teach It Forward',
    sections: ['go_further'],
    overview: "Plan how you'd explain this to someone you know.",
    whyItHelps: 'Preparing to teach shows you where your own understanding has gaps.',
    pedagogy: 'Protégé effect; forces organization and gap-finding.',
    pageSkeleton: [
      'choose audience',
      'draft the explanation',
      'anticipate their question',
      'G6 feedback',
    ],
    interactions: ['freeText', 'mcq'],
    defaultActive: true,
    goodFor: 'conceptual material worth articulating',
    flavor: 'apply',
    outcomeLabel: 'Put to use',
  },
  {
    id: 'make-something',
    name: 'Make Something Small',
    sections: ['go_further'],
    overview: "Make one small thing with what you've learned.",
    whyItHelps: 'Producing something, however small, uses what you know in a new way.',
    pedagogy: 'Generation + production practice; constraints keep it 5-minute-sized.',
    pageSkeleton: [
      'the brief, with 2–3 criteria',
      'make it',
      'self-check against the criteria',
      'one refinement',
    ],
    interactions: ['freeText', 'selfRate'],
    defaultActive: true,
    goodFor:
      'making things — writing, drawing, music, game design, a language — or one small piece of a larger project',
    flavor: 'apply',
    outcomeLabel: 'Put to use',
  },
  {
    id: 'in-the-wild',
    name: 'In the Wild',
    sections: ['go_further'],
    overview: 'Look closely at something real: an article, a chart, a saved resource.',
    whyItHelps: "Spotting ideas out in the world connects what you learn to where it's used.",
    pedagogy:
      'Perceptual learning and critique; connects learning to the world; uses resources when relevant.',
    pageSkeleton: [
      'the artifact (link/excerpt)',
      'what do you notice',
      'expert lens',
      'your takeaway',
    ],
    interactions: ['freeText', 'mcq'],
    defaultActive: true,
    goodFor: 'domains with rich real-world artifacts',
    flavor: 'apply',
    outcomeLabel: 'Put to use',
    usesResources: true,
  },
  {
    id: 'dig-deeper',
    name: 'Dig Deeper',
    sections: ['go_further'],
    overview: 'Explore the exceptions and edge cases the introduction skipped.',
    whyItHelps:
      'First explanations simplify; the nuance is what makes your understanding accurate.',
    pedagogy: 'Desirable difficulty + refining mental models beyond the first-pass simplification.',
    pageSkeleton: [
      'the simplified version recalled (reveal)',
      'the complication',
      'wrestle with it',
      'revised rule of thumb',
    ],
    interactions: ['reveal', 'mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'goals whose intro deliberately simplified',
    flavor: 'extend',
    outcomeLabel: 'Went deeper on',
  },
  {
    id: 'connect-ideas',
    name: 'Connect Ideas',
    sections: ['go_further'],
    overview: 'Link this goal to another goal, interest or field.',
    whyItHelps: "Ideas you've connected are easier to recall and use together.",
    activation: "Turns on by itself once you've started two goals.",
    pedagogy: 'Elaboration + far transfer; building a connected schema rather than islands.',
    pageSkeleton: [
      'the two ideas',
      'find the bridge',
      'a case where the connection pays off',
      'takeaway',
    ],
    interactions: ['freeText', 'matching'],
    // Locked until ≥2 goals are introduced (prefs.ts, docs/06).
    defaultActive: false,
    goodFor: 'a goal with another started goal or interest to link to',
    flavor: 'extend',
    outcomeLabel: 'Branched out from',
  },
]

const byId = new Map(LIBRARY_ITEMS.map((item) => [item.id, item]))

export function getLibraryItem(id: string): LibraryItem | undefined {
  return byId.get(id)
}

export function libraryItemsForSection(
  section: 'next' | 'strengthen' | 'go_further',
): LibraryItem[] {
  return LIBRARY_ITEMS.filter((item) => item.sections.includes(section))
}
