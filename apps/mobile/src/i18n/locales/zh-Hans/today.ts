import type { TranslationOf } from '../en'
import type { today as english } from '../en/today'

export const today: TranslationOf<typeof english> = {
  title: '今天',
  generating: '正在挑选今天的练习',
  section: {
    next: '新知',
    strengthen: '巩固',
    goFurther: '拓展',
    completedToday: '今天 {{count}} 个',
    configureLabel: '设置“{{section}}”',
  },
  card: {
    doneToday: '今天已完成',
    preparing: '准备中',
    prepare: '准备',
    minutes: '{{count}} 分钟',
    minutesShort: '{{count}} 分钟',
  },
  goalLine: {
    foundation: '为你的路径打好基础',
  },
  draft: {
    newActivity: '新练习',
  },
  routine: {
    configure: '设置学习节奏',
  },
  empty: {
    noInterest: '添加一个你想学的东西，就可以开始了。',
    exploreAllNoGoals: '这些兴趣都还没有目标。',
    noGoals: '这个兴趣还没有目标。',
  },
  aboutItem: '关于“{{name}}”',
  configureSheet: {
    title: '练习设置：{{section}}',
    help: {
      next: '从路径上的下一个目标开始，学点新东西。',
      strengthen: '加深对学过内容的记忆或理解。',
      goFurther: '在现实中运用所学，或把它和其他知识点联系起来。',
    },
    listHelp: '这里的练习由这些类型生成。不想看到的可以关掉。',
  },
  request: {
    createTitle: '新建一个“{{section}}”练习',
    create: '创建',
    forGoal: '针对已有目标（可选）',
    activityType: '练习类型（可选）',
    activityTypeChosen: '练习类型',
    video: '视频',
    reading: '阅读材料',
    focusPlaceholder: '想重点练什么，或者想怎么学',
  },
  week: {
    count_one: '这周学了 {{count}} 天。',
    count_other: '这周学了 {{count}} 天。',
    countOfTarget_one: '这周 {{target}} 天里学了 {{count}} 天。',
    countOfTarget_other: '这周 {{target}} 天里学了 {{count}} 天。',
    learnedToday: '今天学过了。',
    fresh: ['新的一周，随时可以开始。', '做一个练习，这周就开始了。', '哪天开始都不晚。'],
    going: ['进展不错。', '一点点积累起来了。', '节奏很好。', '稳稳地来。'],
    met: [
      '这周完成了，给自己鼓个掌。',
      '说到做到。',
      '计划的每一天都做到了，真棒。',
      '这周圆满了，未来的你会感谢现在的你。',
    ],
    beyond: ['超额完成。', '比计划的还多，真好。', '已经超过目标，还在继续。'],
    open: ['跟着好奇心走。', '按自己的方式学习。', '按自己的节奏，学得不错。'],
  },
  routineSheet: {
    daysToAimFor: '每周目标天数',
    noTarget: '不设目标',
    title: '学习节奏',
    feedbackNotice: '目前各板块是固定的。想改的话，可以去<a>反馈板</a>点赞或留言。',
    next: { what: '学点新东西', cadence: '每天 1 个' },
    strengthen: { what: '复习并加深所学', cadence: '可选' },
    goFurther: { what: '运用所学，或更进一步', cadence: '可选' },
    generating: '正在调整你的学习节奏',
    prompt: '你想多做些什么，少做些什么？',
    promptHint: '之后的练习都会照此安排。',
    placeholder: '多练口语，少学语法',
  },
}
