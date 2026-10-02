import type { LibraryItemCopy } from '../en/library'

export const library: Record<string, Partial<LibraryItemCopy>> = {
  // Next
  'plain-explainer': {
    name: '大白话讲解',
    overview: '通过一个日常比喻认识这个知识点，再把它讲准确。',
    whyItHelps: '把新东西和你已经知道的联系起来，更容易记住。',
  },
  'worked-example': {
    name: '例题示范',
    overview: '一步步跟着看一个例子，再自己做一步。',
    whyItHelps: '看已经解好的例子，比从零摸索更快学会方法，刚入门时尤其如此。',
  },
  'guided-discovery': {
    name: '引导发现',
    overview: '回答几个问题，自己一步步找到这个知识点。',
    whyItHelps: '在知识点被点明之前自己想出来，会记得更牢。',
  },
  'mini-case': {
    name: '小案例',
    overview: '读一个简短的真实故事，想想你会怎么做，再复盘。',
    whyItHelps: '故事能说明一个知识点为什么重要，也给记忆一个抓手。',
  },
  'big-picture-map': {
    name: '全景地图',
    overview: '看看这个知识点在整个学科中的位置。',
    whyItHelps: '了解一个学科的整体轮廓，每块新知识都更容易归位。',
    activation: '在你开始第一个目标之前默认开启。',
  },
  'watch-along': {
    name: '边看边学',
    overview: '看一段短视频，中途回答几个问题。',
    whyItHelps: '停下来回答问题，让观看变成学习。',
  },
  'guided-reading': {
    name: '带着问题读',
    overview: '带着一个问题读一段简短的节选。',
    whyItHelps: '有目的地阅读，能帮你注意到并记住重要的内容。',
  },

  // Strengthen
  'retrieval-quiz': {
    name: '快速回忆',
    overview: '凭记忆回答几个小问题。',
    whyItHelps: '把东西从记忆里提取出来，才能真正记住。',
  },
  'explain-back': {
    name: '用自己的话讲',
    overview: '用你自己的话解释这个知识点，并得到反馈。',
    whyItHelps: '用自己的话说出来，能看出你理解了什么、还缺什么。',
  },
  'spot-the-error': {
    name: '找错误',
    overview: '找出例子里的错误，然后改正。',
    whyItHelps: '发现错误，能让你对“正确”更敏锐。',
  },
  'compare-contrast': {
    name: '对比辨析',
    overview: '把两个容易混淆的知识点放在一起看。',
    whyItHelps: '看清两个知识点具体哪里不同，就不会再混淆。',
  },
  'faded-example': {
    name: '补全例题',
    overview: '补上例题里缺少的步骤。',
    whyItHelps: '这是从跟着方法做到独立运用之间的桥梁。',
  },
  'mixed-review': {
    name: '混合复习',
    overview: '回答把最近内容和之前目标混在一起的问题。',
    whyItHelps: '在话题之间来回切换更难，正因如此才记得更久。',
    activation: '开始三个目标后会自动开启。',
  },
  'focused-drill': {
    name: '专项训练',
    overview: '针对一个薄弱点，做简短、集中的训练。',
    whyItHelps: '在稍稍超出舒适区的地方练习，每次都有反馈，技能提升最快。',
  },
  'notice-training': {
    name: '眼力训练',
    overview: '快速给例子分类，练出识别规律的眼力。',
    whyItHelps: '大量快速、有反馈的判断，能练出专家那种一眼看出的直觉。',
  },

  // Go further
  'put-to-work': {
    name: '用起来',
    overview: '规划怎样把它用到你自己的项目、工作或生活中。',
    whyItHelps: '在真实的地方用上一个知识点，它才真正变成你的。',
    outcomeLabel: '已运用',
  },
  'scenario-challenge': {
    name: '情境挑战',
    overview: '在一个新情境里做决定，看看会发生什么。',
    whyItHelps: '亲自做决定，而不只是选答案，才能为真实的决定做好准备。',
    outcomeLabel: '已运用',
  },
  'teach-back': {
    name: '教给别人',
    overview: '想想你会怎么把它讲给认识的人听。',
    whyItHelps: '准备教别人，会暴露你自己理解上的漏洞。',
    outcomeLabel: '已运用',
  },
  'make-something': {
    name: '做点小东西',
    overview: '用学到的东西做一件小作品。',
    whyItHelps: '做出一样东西，哪怕很小，也是在用新的方式运用所学。',
    outcomeLabel: '已运用',
  },
  'in-the-wild': {
    name: '现实观察',
    overview: '仔细看一样真实的东西：一篇文章、一张图表、一份保存的资料。',
    whyItHelps: '在现实中发现这些知识点，能把所学和它的用处联系起来。',
    outcomeLabel: '已运用',
  },
  'dig-deeper': {
    name: '深入探究',
    overview: '探索入门时略过的例外和边界情况。',
    whyItHelps: '最初的解释总会简化，细节才让你的理解准确。',
    outcomeLabel: '已深入',
  },
  'connect-ideas': {
    name: '串联知识点',
    overview: '把这个目标和另一个目标、兴趣或领域联系起来。',
    whyItHelps: '相互关联的知识点，更容易一起想起、一起运用。',
    outcomeLabel: '已串联',
  },
}
