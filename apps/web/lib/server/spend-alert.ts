import { getDeps } from './deps'
import { ALERTS_ADDRESS, sendEmail } from './email'
import { approxUsd, GLOBAL_DAILY_BUDGET_WEIGHTED, spendAlertLevel, weightedUsed } from './metering'
import type { TokenTotals } from './store'

const format = (n: number) => n.toLocaleString('en-US')

/**
 * Emails the team when the day's proxy-wide spend first reaches 50%, 90% and
 * 100% of the cap (docs/04 §Usage metering). Called with the totals the proxy
 * already has after each call, so it costs a query only past 50%. Never
 * throws: an alert that fails is logged, and the AI call it rode on is
 * unaffected.
 */
export async function alertOnSpend(day: string, total: TokenTotals): Promise<void> {
  const level = spendAlertLevel(total)
  if (level === undefined) return
  try {
    if (!(await getDeps().store.claimSpendAlert(day, level))) return
    const lines = [
      `On ${day} (UTC) the AI proxy has used ${format(weightedUsed(total))} of ${format(GLOBAL_DAILY_BUDGET_WEIGHTED)} weighted tokens, about $${approxUsd(total).toFixed(2)}.`,
      level === 100
        ? 'AI requests are refused for every device until 00:00 UTC.'
        : 'At 100%, AI requests are refused for every device until 00:00 UTC.',
      'Per day: select * from spend_by_day order by day desc',
      'Per device: select * from device_usage where day = current_date order by output_tokens desc',
    ]
    await sendEmail({
      subject: `AI spend at ${level}% of today's cap`,
      text: lines.join('\n\n'),
      to: ALERTS_ADDRESS,
      at: 'spend_alert',
    })
  } catch (e) {
    console.log(JSON.stringify({ at: 'spend_alert', error: (e as Error).name }))
  }
}
