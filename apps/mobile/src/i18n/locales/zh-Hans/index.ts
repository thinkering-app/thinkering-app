/**
 * Simplified Chinese. Glossary, used everywhere:
 * Interest 兴趣 · Path 路径 · Goal 目标 · Activity 练习 · Section 板块
 * Today 今天 · History 记录 · Me 我
 * Next 新知 · Strengthen 巩固 · Go further 拓展
 * Goal status: Not started 未开始 · Introduced 已入门 · Strengthened 已巩固 · Put to use 已运用
 * In focus 专注 · Exploring 探索 · Archived 已归档
 * Library item 学习策略 · Learning routine 学习节奏 · Reflect 回顾 · Backup 备份
 * Resource 资料 · Context 相关的人和事 · Outcome (hoped for) 收获 · Topic 话题 · Concept/idea 知识点
 * Generate/write (an activity) 生成. Address the learner as 你.
 */
import type { LocaleTranslation } from '../en'
import { common } from './common'
import { history } from './history'
import { intake } from './intake'
import { library } from './library'
import { me } from './me'
import { path } from './path'
import { player } from './player'
import { today } from './today'

export const zhHans = {
  common,
  today,
  path,
  history,
  me,
  intake,
  player,
  library,
} satisfies LocaleTranslation
