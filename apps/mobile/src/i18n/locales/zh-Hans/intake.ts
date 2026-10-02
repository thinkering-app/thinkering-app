import type { TranslationOf } from '../en'
import type { intake as english } from '../en/intake'

export const intake: TranslationOf<typeof english> = {
  welcome: {
    greeting: '欢迎来到',
    body: '选一个你想学的东西。我们会为你规划一条路径，每天安排几件小事。',
    getStarted: '开始',
    signInOrRestore: '我已有账户或备份文件',
    restoreFromBackup: '从备份恢复',
    languageAccessibilityLabel: '语言：{{language}}',
  },
  returning: {
    title: '欢迎回来',
    signIn: '登录你的账户',
    restoreFile: '从备份文件恢复',
  },
  signIn: {
    title: '登录',
    restoring: '正在找回你的学习内容…',
    switchAccount: '使用其他账户',
  },
  learn: {
    question: '你想学的一件事是什么？',
    placeholder: '任何你好奇的东西',
    addMoreLater: '之后可以再添加更多。',
    examples: {
      llms: '了解大语言模型和 AI',
      personalFinance: '改进我的个人理财方式',
      productManagement: '产品管理技能',
      climate: '多了解气候与可持续发展',
      drawing: '学画画',
      spanish: '重拾西班牙语',
      german: '能用德语日常对话',
      chess: '提高国际象棋水平',
    },
  },
  why: {
    question: '你为什么想学？',
    options: {
      career: '为了工作',
      personalGoal: '为了个人目标',
      fun: '为了好玩',
    },
    noteQuestion: '你希望能做到什么？为什么？',
  },
  experience: {
    question: '你有多少经验？',
    options: {
      gettingStarted: '刚刚起步',
      explored: '了解过一点',
      inMiddle: '有一定基础',
      experienced: '经验丰富',
    },
    noteQuestion: '你以前试过什么？效果怎么样？',
  },
  topics: {
    question: '哪些话题和你最相关？',
    generating: '正在寻找话题',
  },
  success: {
    question: '你希望有什么收获？',
    generating: '正在思考',
  },
  chipPicker: {
    addYourOwn: '自己添加',
  },
  time: {
    question: '你想花多少时间？',
    howOften: '多久一次',
    frequency: {
      daily: '每天',
      severalWeekly: '每周几次',
      whenICan: '有空时',
    },
    eachSession: '每次',
    minutes_one: '{{count}} 分钟',
    minutes_other: '{{count}} 分钟',
    custom: '自定义',
    customAccessibilityLabel: '自定义每次时长（分钟）',
    minUnit: '分钟',
    readingPerPage: '每页阅读量',
    reading: {
      less: '较短',
      balanced: '适中',
      more: '较长',
    },
  },
  direction: {
    question: '我们可以从这个方向开始。',
    evolving: '随着你的学习，我们会不断调整它。',
    generating: '正在规划路径',
    goToToday: '开始今天的练习',
    modeHint: {
      focus: '适合想稳步推进的东西。',
      exploring: '适合出于好奇、不着急的东西。',
    },
    modeLabel: {
      focus: '专注',
      exploring: '探索',
    },
    modeAccessibilityLabel: {
      focus: '模式：专注。点按切换。',
      exploring: '模式：探索。点按切换。',
    },
  },
  addInterest: {
    resumeTitle: '从上次停下的地方继续？',
    keepGoing: '继续',
    startNew: '学点新的',
  },
  leave: {
    title: '以后再完成？',
    saveForLater: '先保存',
    discard: '放弃',
  },
  optionalNote: {
    suffix: '（可选）',
  },
  stepScreen: {
    back: '返回',
    close: '关闭',
  },
}
