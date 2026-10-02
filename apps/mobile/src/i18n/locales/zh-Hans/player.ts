import type { TranslationOf } from '../en'
import type { player as english } from '../en/player'

export const player: TranslationOf<typeof english> = {
  back: '返回',
  close: '关闭',
  missing: '这个练习已经不在了。',
  writingPage: '正在生成第 {{page}} 页…',
  wait: {
    planning: '正在规划你的练习',
    writing: '正在生成你的练习',
  },
  review: {
    working: '再看一遍你的答案',
  },
  ask: {
    label: '提问',
    working: '正在想答案',
    placeholder: '有什么想问的？',
    questionLabel: '你的问题',
    askedHeading: '你问的是',
  },
  freeText: {
    thinkAbout: '想一想…',
    askQuestion: '提个问题',
  },
  fillBlank: {
    blankLabel: '第 {{number}} 空',
    answer_one: '答案',
    answer_other: '答案',
  },
  ordering: {
    moveUp: '将“{{label}}”上移',
    moveDown: '将“{{label}}”下移',
    check: '检查',
  },
  reveal: {
    hint: '先想好答案，再点一下查看',
    accessibilityHint: '显示答案',
  },
  video: {
    openClip: '打开视频片段',
  },
  unknownBlock: '这部分需要更新版本的应用才能显示。',
  summary: {
    celebrations: [
      '干得不错。',
      '做得好。',
      '收工。',
      '又完成一个。',
      '这是你应得的。',
      '大脑，略微升级。',
      '瞧你，又学到新东西了。',
      '神经元：已重连。',
    ],
    goalLine: {
      introduce: '你学习了<bold>{{goal}}</bold>。',
      strengthen: '你巩固了<bold>{{goal}}</bold>。',
      apply: '你在<bold>{{goal}}</bold>上更进了一步。',
    },
    activityType: '练习类型：<bold>{{name}}</bold>',
    aboutItem: '关于“{{name}}”',
    ratingPrompt: '这个练习有用吗？',
    rating: {
      down: '没用',
      mixed: '一般',
      up: '有用',
    },
    sent: '已发送，谢谢。',
    notePlaceholder: '还有什么想说的？（可选）',
    noteLabel: '评分详情',
    send: '发送',
    sending: '正在发送…',
    sendError: '没发出去，请稍后再试。',
    shareHelp:
      '你的评分和留言保存在这台设备上。为了帮助开发者判断练习质量，你可以把这个练习连同评分和留言发给他们，但不会包括你的答案。',
  },
  error: {
    budgetUsed: '今天包含的生成次数已经用完了。',
    searchFailed: '暂时没能搜索网页。',
    badOutput: '返回的内容格式不对，没法使用。',
    generic: '暂时没能生成。',
    outdatedClient: '请更新 thinkering 后继续使用。',
  },
  fallbackReview: {
    withConcepts: '这次值得记住的：{{concepts}}。',
    bare: '值得记住的：这个练习围绕的核心概念。',
  },
}
