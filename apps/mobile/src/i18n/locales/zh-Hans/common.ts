import type { TranslationOf } from '../en'
import type { common as english } from '../en/common'

export const common: TranslationOf<typeof english> = {
  tryAgain: '重试',
  save: '保存',
  done: '完成',
  continue: '继续',
  add: '添加',
  cancel: '取消',
  back: '返回',
  close: '关闭',
  screenError: '这个页面出了点问题。',
  dbUnavailable: {
    anotherTab: 'thinkering 已在另一个标签页中打开。关掉那个标签页，就能在这里继续。',
    noStorage: '这个浏览器不允许 thinkering 存储数据，无痕浏览会阻止存储。',
    unknown: '准备数据时出了点问题。请重启应用。',
  },
  addInterest: '添加兴趣',
  sendFeedback: '发送反馈',
  tabs: {
    today: '今天',
    path: '路径',
    history: '记录',
    me: '我',
  },
  calendarMonth: {
    previousMonth: '上个月',
    nextMonth: '下个月',
    title: '{{year}}年{{month}}月',
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    weekdayInitials: ['一', '二', '三', '四', '五', '六', '日'],
    weeksInARow_one: '连续 {{count}} 周',
    weeksInARow_other: '连续 {{count}} 周',
  },
  aiNote: '内容由 AI 编写，可能有误。',
  interestSelector: {
    explore: '探索',
    all: '全部',
  },
  textField: {
    counter: '{{length}} / {{max}}',
    counterOver: '{{length}} / {{max}} · 太长，无法发送',
  },
}
