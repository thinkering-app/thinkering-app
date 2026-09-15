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
    overview: 'The idea explained through a familiar analogy, then made precise.',
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
    overview: 'Watch one concrete example unfold step by step, then try one step yourself.',
    pedagogy:
      'Worked-example effect: novices learn more from studying steps than solving cold. Great for procedures, math-ish, language patterns.',
    pageSkeleton: ['setup', 'steps block', 'faded step', 'recap'],
    interactions: ['fillBlank', 'mcq'],
    defaultActive: true,
    goodFor: 'procedures, quantitative material, language patterns',
  },
  {
    id: 'guided-discovery',
    name: 'Guided Discovery',
    sections: ['next'],
    overview: 'Questions lead you to the idea before it gets a name.',
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
    overview: 'A short real story that runs into the concept, then the debrief.',
    pedagogy:
      'Case-based learning; episodic memory hooks; shows why the concept matters. Good for strategy, finance, PM, climate.',
    pageSkeleton: ['story', '"what would you do"', 'debrief', 'takeaway check'],
    interactions: ['mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'strategy, finance, product management, climate',
  },
  {
    id: 'big-picture-map',
    name: 'Big Picture Map',
    sections: ['next'],
    overview: 'Where this idea sits in the landscape of the subject.',
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
    overview: 'Learn from a short, well-chosen video clip, with checkpoints.',
    pedagogy:
      'Multimedia learning: segmenting + embedded questions measurably beat passive watching. Uses a saved resource (resourceEmbed). Great for demos, technique, worked examples on video.',
    pageSkeleton: ['why this clip (focus prompt)', 'clip segment', 'checkpoint', 'second segment', 'recap check'],
    interactions: ['mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'demos, technique, worked examples on video',
    usesResources: true,
  },
  {
    id: 'guided-reading',
    name: 'Guided Reading',
    sections: ['next'],
    overview: 'Read a short article excerpt with a question in mind.',
    pedagogy:
      'Elaborative interrogation + reading with purpose; comprehensible input for languages. Uses a saved resource.',
    pageSkeleton: ['the question to hold', 'excerpt/link', 'what did you find', 'connect to the concept'],
    interactions: ['freeText', 'mcq'],
    defaultActive: true,
    goodFor: 'knowledge-rich domains, language comprehensible input',
    usesResources: true,
  },

  // ── Strengthen ────────────────────────────────────────────────────────────
  {
    id: 'retrieval-quiz',
    name: 'Quick Retrieval',
    sections: ['strengthen'],
    overview: 'A short mixed quiz from memory — the fastest way to make it stick.',
    pedagogy:
      'Retrieval practice / testing effect; spacing when it revisits older goals. Default strengthen item.',
    pageSkeleton: ['warm-up reveal', '3–5 mixed questions', 'tricky-one revisit'],
    interactions: ['mcq', 'fillBlank', 'ordering'],
    defaultActive: true,
    goodFor: 'any domain; the default strengthen choice',
  },
  {
    id: 'explain-back',
    name: 'Explain It Back',
    sections: ['strengthen'],
    overview: 'Explain the idea in your own words; get pointed feedback.',
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
    overview: "Something's wrong in this example — find it.",
    pedagogy:
      'Error-spotting builds discrimination and challenges illusions of fluency. Good for code, grammar, reasoning, chess.',
    pageSkeleton: ['flawed artifact', 'find/select the error', "why it's wrong", 'fixed version'],
    interactions: ['mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'code, grammar, reasoning, chess',
  },
  {
    id: 'compare-contrast',
    name: 'Compare & Contrast',
    sections: ['strengthen'],
    overview: 'Two ideas that are easy to mix up, side by side.',
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
    overview: 'A worked example with missing steps — you fill the gaps.',
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
    overview: "Today's material woven together with earlier goals.",
    pedagogy: 'Interleaving + spacing; harder, stickier. Unlocks once ≥3 goals are introduced.',
    pageSkeleton: ['4–6 interleaved questions across goals', 'pattern debrief'],
    interactions: ['mcq', 'fillBlank', 'matching'],
    // Activates once ≥3 goals are introduced (docs/06).
    defaultActive: false,
    goodFor: 'paths with ≥3 introduced goals',
  },
  {
    id: 'focused-drill',
    name: 'Focused Drill',
    sections: ['strengthen'],
    overview: 'Short, targeted reps on one specific weak point.',
    pedagogy:
      'Deliberate practice: isolate a sub-skill just past comfort, immediate specific feedback each rep. Best for skill domains — languages, drawing, music, chess, coding.',
    pageSkeleton: ['pick the weak point', '3–5 tight reps', 'feedback per rep', 'one harder rep'],
    interactions: ['fillBlank', 'mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'skill domains — languages, drawing, music, chess, coding',
  },
  {
    id: 'notice-training',
    name: 'Noticing Reps',
    sections: ['strengthen'],
    overview: 'Rapid-fire "what is this / which is better" classification reps.',
    pedagogy:
      "Perceptual learning (Kellman): many short classification trials with feedback build the expert's fast pattern recognition. Great for chess positions, art/composition, grammar forms, chart reading.",
    pageSkeleton: ['what to notice', '5–8 quick classify/compare reps', 'the pattern named', 'transfer rep'],
    interactions: ['mcq', 'matching'],
    defaultActive: true,
    goodFor: 'chess positions, art/composition, grammar forms, chart reading',
  },

  // ── Go further ────────────────────────────────────────────────────────────
  {
    id: 'put-to-work',
    name: 'Put It to Work',
    sections: ['go_further'],
    overview: 'Apply this to your own project, work, or life.',
    pedagogy:
      "Transfer + relevance; uses the interest's contexts (projects/people/environments) when they fit.",
    pageSkeleton: ['pick/confirm the context', 'plan the application', 'pressure-test', 'concrete next step'],
    interactions: ['freeText', 'mcq', 'reveal'],
    defaultActive: true,
    goodFor: 'users with saved contexts; practical domains',
    flavor: 'apply',
    outcomeLabel: 'Put to use',
  },
  {
    id: 'scenario-challenge',
    name: 'Scenario Challenge',
    sections: ['go_further'],
    overview: 'A fresh situation; make the calls and see the consequences.',
    pedagogy: 'Near-transfer practice with feedback; decisions > recognition.',
    pageSkeleton: ['scenario', '2–3 decision points', 'debrief', 'principle recap'],
    interactions: ['mcq', 'freeText'],
    defaultActive: true,
    goodFor: 'decision-heavy domains — strategy, finance, PM',
    flavor: 'apply',
    outcomeLabel: 'Put to use',
  },
  {
    id: 'teach-back',
    name: 'Teach It Forward',
    sections: ['go_further'],
    overview: "Prepare how you'd explain this to a specific person.",
    pedagogy: 'Protégé effect; forces organization and gap-finding.',
    pageSkeleton: ['choose audience', 'draft the explanation', 'anticipate their question', 'G6 feedback'],
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
    overview:
      'A tiny creation with tight constraints — a sentence, sketch plan, budget line, opening repertoire choice.',
    pedagogy: 'Generation + production practice; constraints keep it 5-minute-sized.',
    pageSkeleton: ['the brief', 'make it', 'self-check against criteria', 'one refinement'],
    interactions: ['freeText', 'selfRate'],
    defaultActive: true,
    goodFor: 'creative and production skills — languages, drawing, writing',
    flavor: 'apply',
    outcomeLabel: 'Put to use',
  },
  {
    id: 'in-the-wild',
    name: 'In the Wild',
    sections: ['go_further'],
    overview: 'Analyze something real — an article, chart, position, or one of your saved resources.',
    pedagogy:
      'Perceptual learning and critique; connects learning to the world; uses resources when relevant.',
    pageSkeleton: ['the artifact (link/excerpt)', 'what do you notice', 'expert lens', 'your takeaway'],
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
    overview: 'The nuance the introduction skipped: edge cases, exceptions, the "it depends".',
    pedagogy: 'Desirable difficulty + refining mental models beyond the first-pass simplification.',
    pageSkeleton: ['the simplified version recalled (reveal)', 'the complication', 'wrestle with it', 'revised rule of thumb'],
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
    overview: 'Tie this goal to another goal, interest, or adjacent field.',
    pedagogy: 'Elaboration + far transfer; building a connected schema rather than islands.',
    pageSkeleton: ['the two ideas', 'find the bridge', 'a case where the connection pays off', 'takeaway'],
    interactions: ['freeText', 'matching'],
    defaultActive: true,
    goodFor: 'users with multiple goals or interests',
    flavor: 'extend',
    outcomeLabel: 'Branched out from',
  },
]

const byId = new Map(LIBRARY_ITEMS.map((item) => [item.id, item]))

export function getLibraryItem(id: string): LibraryItem | undefined {
  return byId.get(id)
}

export function libraryItemsForSection(section: 'next' | 'strengthen' | 'go_further'): LibraryItem[] {
  return LIBRARY_ITEMS.filter((item) => item.sections.includes(section))
}
