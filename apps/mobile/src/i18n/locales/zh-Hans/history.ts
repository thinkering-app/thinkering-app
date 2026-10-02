import type { TranslationOf } from '../en'
import type { history as english } from '../en/history'

export const history: TranslationOf<typeof english> = {
  title: '记录',
  empty: '完成的练习会显示在这里。',
  entryAccessibilityLabel: '{{title}}。{{outcome}}',
  today: '今天',
  yesterday: '昨天',
  outcomeLine: {
    introduce: '已入门：{{subject}}',
    introduceBare: '已入门',
    strengthen: '已巩固：{{subject}}',
    strengthenBare: '已巩固',
    apply: '已运用：{{subject}}',
    applyBare: '已运用',
    withVerb: '{{verb}}：{{subject}}',
  },
}
