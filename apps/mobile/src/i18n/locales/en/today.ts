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
    preparing: 'Preparing',
    prepare: 'Prepare',
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
    activityTypeChosen: 'Activity type',
    video: 'Video',
    reading: 'Reading',
    focusPlaceholder: "Anything to focus on, or how you'd like to learn it",
  },
  /** Tapping Today's week dots (docs/01 §3): the days learned this week, then where the week stands. */
  week: {
    count_one: '{{count}} day this week.',
    count_other: '{{count}} days this week.',
    countOfTarget_one: '{{count}} of {{target}} day this week.',
    countOfTarget_other: '{{count}} of {{target}} days this week.',
    learnedToday: 'Learned today.',
    /** A target, and nothing yet this week. No claims about time left: it may be Sunday. */
    fresh: [
      'A new week, ready when you are.',
      'One activity gets the week going.',
      'Any day is a good day to start.',
    ],
    /** Under way. */
    going: ['Nicely under way.', "It's adding up.", 'Good rhythm so far.', 'Steady does it.'],
    /** Exactly the target. */
    met: [
      'Week complete. Take a bow.',
      'You did what you set out to do.',
      'Every day you planned. Well done.',
      "That's the week. Your future self says thanks.",
    ],
    /** Past it. */
    beyond: [
      'Above and beyond.',
      'More than you planned. Lovely.',
      'Past your target, and still going.',
    ],
    /** No target. The dots only show once there's a day, so there's always one to celebrate. */
    open: [
      'Curiosity, followed.',
      'Learning on your own terms.',
      'Nicely done, on your own schedule.',
    ],
  },
  routineSheet: {
    title: 'Learning routine',
    daysToAimFor: 'Days to aim for',
    noTarget: 'No target',
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
