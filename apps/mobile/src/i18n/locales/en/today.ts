export const today = {
  title: 'Today',
  generating: "Picking today's activities",
  section: {
    next: 'Next',
    strengthen: 'Strengthen',
    goFurther: 'Go further',
    /** The count next to a section heading once something's been done today. */
    completedToday: '{{count}} today',
    configureLabel: 'Configure {{section}}',
  },
  card: {
    doneToday: 'Done today',
    writing: 'Writing',
    write: 'Write',
    minutes: '{{count}} minutes',
    minutesShort: '{{count}} min',
  },
  goalLine: {
    /** The early-days card's goal line, before there's a real goal to show. */
    foundation: 'A foundation for your path',
  },
  draft: {
    newActivity: 'New activity',
  },
  routine: {
    configure: 'Configure learning routine',
  },
  empty: {
    noInterest: 'Add something you want to learn to get started.',
    exploreAllNoGoals: 'None of these interests have goals yet.',
    noGoals: 'This interest has no goals yet.',
  },
  /** The ⓘ beside an activity type, in the configure and request sheets. */
  aboutItem: 'About {{name}}',
  configureSheet: {
    title: 'Activity settings: {{section}}',
    help: {
      next: 'Learn something new from the next goal on your path.',
      strengthen: "Improve your memory or understanding of something you've met before.",
      goFurther: 'Apply what you learn in the real world, or connect it to other ideas.',
    },
    listHelp: "Activities here are made from these types. Turn off any you'd rather not see.",
  },
  request: {
    createTitle: 'Create a new {{section}} activity',
    create: 'Create',
    forGoal: 'For an existing goal (optional)',
    activityType: 'Activity type (optional)',
    focusPlaceholder: "Anything to focus on, or how you'd like to learn it",
  },
  routineSheet: {
    title: 'Learning routine',
    feedbackNotice:
      'The sections are set for now. To change that, upvote or comment on <a>the feedback board</a>.',
    next: { what: 'Learn something new', cadence: '1 a day' },
    strengthen: { what: 'Review and deepen what you’ve learned', cadence: 'Optional' },
    goFurther: { what: 'Put your learning to use, or take it further', cadence: 'Optional' },
    generating: 'Adjusting your routine',
    prompt: 'What would you like more or less of?',
    promptHint: 'Your activities will follow it from here on.',
    placeholder: 'More speaking practice, less grammar',
  },
}
