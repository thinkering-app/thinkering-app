/**
 * Copy for the activity player (docs/05): the document viewer, Ask, the
 * blocks that carry user-facing text of their own, and the summary page.
 * Sentence case, no exclamation marks (AGENTS.md §Minimal user-facing text).
 */
export const player = {
  back: 'Back',
  close: 'Close',
  missing: 'This activity is no longer here.',
  writingPage: 'Writing page {{page}}…',
  wait: {
    planning: 'Planning your activity',
    writing: 'Writing your activity',
  },
  review: {
    working: 'One more look at your answers',
  },
  ask: {
    label: 'Ask',
    working: 'Working out an answer',
    placeholder: "What's on your mind?",
    questionLabel: 'Your question',
    askedHeading: 'You asked',
  },
  freeText: {
    thinkAbout: 'Think about…',
    askQuestion: 'Ask a question',
  },
  fillBlank: {
    blankLabel: 'Blank {{number}}',
    answer_one: 'Answer',
    answer_other: 'Answers',
  },
  ordering: {
    moveUp: 'Move {{label}} up',
    moveDown: 'Move {{label}} down',
  },
  reveal: {
    show: 'Show me',
  },
  video: {
    openClip: 'Open the clip',
  },
  unknownBlock: 'This part needs a newer version of the app.',
  summary: {
    celebrations: [
      'Nicely done.',
      'Good work.',
      "That's a wrap.",
      'Another one down.',
      'Well earned.',
      'Brain, slightly upgraded.',
      'Look at you, learning things.',
      'Neurons: rewired.',
    ],
    goalLine: {
      introduce: 'You learned <bold>{{goal}}</bold>.',
      strengthen: 'You strengthened <bold>{{goal}}</bold>.',
      apply: 'You went further on <bold>{{goal}}</bold>.',
    },
    activityType: 'Activity type: <bold>{{name}}</bold>',
    aboutItem: 'About {{name}}',
    ratingPrompt: 'Was this useful?',
    rating: {
      down: 'Not useful',
      mixed: 'Mixed',
      up: 'Useful',
    },
    sent: 'Sent — thank you.',
    notePlaceholder: 'Anything more? (optional)',
    noteLabel: 'Rating detail',
    send: 'Send',
    sending: 'Sending…',
    sendError: "That didn't send. Try again later.",
    shareHelp:
      'Your rating and note are saved on this device. To help the developers judge activity quality, you can send them this activity with your rating and note — not your answers.',
  },
  error: {
    budgetUsed: "You've used today's included generation.",
    searchFailed: "Couldn't search the web just now.",
    badOutput: "That came back in a shape we couldn't use.",
    generic: "Couldn't generate that just now.",
    /** A kind the proxy can't serve because this build is older than it. */
    outdatedClient: 'Update thinkering to keep going.',
  },
  fallbackReview: {
    withConcepts: 'Worth holding on to from this one: {{concepts}}.',
    bare: 'Worth holding on to: the idea this activity was built around.',
  },
}
