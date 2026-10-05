import { OUTPUT_TOKEN_WEIGHT, weightedTokens } from '@thinkering/core'
import type { TokenTotals, UsageAfter, UsageDelta, UsageRecord } from './store'

/**
 * Budget math (D14, docs/04 §Usage metering). Weighted tokens: output ×4
 * input; cached input ~free (not counted). Sized for roughly 60 generations a
 * day, with a reserved slice so in-activity calls (G6 review, G7 Ask) never
 * starve. Metering days are UTC (D12's device-local day is a UI concept).
 */

export const DAILY_BUDGET_WEIGHTED = 500_000
/** Slice only activity.review / activity.question may spend into. */
export const RESERVED_WEIGHTED = 75_000
/** Re-exported so the metering module reads as one piece; defined in packages/core. */
export const OUTPUT_WEIGHT = OUTPUT_TOKEN_WEIGHT

/** In-activity kinds that draw from the protected slice. */
export const PROTECTED_KINDS = new Set(['activity.review', 'activity.question'])

/**
 * Weighted tokens the whole proxy may spend in a UTC day, across every device:
 * the backstop for many devices, which per-device budgets can't bound.
 * `AI_DAILY_LIMIT_WEIGHTED` overrides it per deployment.
 */
export const GLOBAL_DAILY_BUDGET_WEIGHTED =
  Number(process.env.AI_DAILY_LIMIT_WEIGHTED) || 20_000_000

/** Percentages of the proxy-wide cap that email an alert, each at most once a UTC day. */
export const SPEND_ALERT_LEVELS = [50, 90, 100] as const
export type SpendAlertLevel = (typeof SPEND_ALERT_LEVELS)[number]

/**
 * Sonnet 5 list prices, USD per million tokens. Only for the rough dollar
 * figure in alerts: most calls are Sonnet, so it runs slightly high.
 */
export const APPROX_USD_PER_MTOK = { input: 2, output: 10 } as const

/** Counts repair round-trips across kinds; its burst limit is in BURST_LIMITS. */
export const REPAIR_COUNTER = 'repair'

/** Per-kind daily burst limits to prevent abuse of the expensive kinds. */
export const BURST_LIMITS: Record<string, number> = {
  'intake.approach': 10,
  /** Retired, still sent by older builds (docs/04 §Retired kinds). */
  'intake.choices': 10,
  'intake.outcomes': 10,
  'intake.topicOptions': 10,
  'intake.path': 15,
  'resources.search': 10,
  /**
   * Find more, off for now: each call is minutes of web search, too much of
   * the shared budget for the beta. Zero refuses every call, and a grant can't
   * scale it up. The app disables the button to match (FIND_MORE_ENABLED);
   * restore to 10 to turn it back on.
   */
  'resources.more': 0,
  'activity.generate': 80,
  'today.plan': 60,
  'reflect.open': 15,
  'reflect.update': 15,
  'resource.describe': 40,
  /** Not a model call — the page fetch behind add-by-link, limited for the same reason. */
  'fetch.url': 60,
  /**
   * Repairs across all kinds. A client repairs at most once per call, and rarely;
   * the cap keeps the repair turn, whose text the client supplies, from becoming
   * a free-form channel to the model.
   */
  [REPAIR_COUNTER]: 30,
}

export function weightedUsed(usage: TokenTotals): number {
  return weightedTokens(usage.inputTokens, usage.outputTokens)
}

/** The highest alert level the day's proxy-wide total has reached, if any. */
export function spendAlertLevel(total: TokenTotals): SpendAlertLevel | undefined {
  const percent = (100 * weightedUsed(total)) / GLOBAL_DAILY_BUDGET_WEIGHTED
  return SPEND_ALERT_LEVELS.findLast((level) => percent >= level)
}

export function approxUsd(total: TokenTotals): number {
  return (
    (total.inputTokens * APPROX_USD_PER_MTOK.input +
      total.outputTokens * APPROX_USD_PER_MTOK.output) /
    1_000_000
  )
}

export function utcDayOf(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10)
}

export function nextUtcMidnight(nowMs: number): string {
  const d = new Date(nowMs)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString()
}

export type BudgetDecision =
  | { allowed: true }
  | { allowed: false; reason: 'budget_exhausted' | 'kind_limit_reached' | 'service_limit_reached' }

/**
 * The state before a delta, from the state after it — what the call that
 * applied the delta decides on, since it reserves before it checks.
 */
export function withoutDelta(after: UsageAfter, delta: UsageDelta): UsageAfter {
  const kindCalls = { ...after.device.kindCalls }
  for (const counter of delta.counters) kindCalls[counter] = (kindCalls[counter] ?? 0) - delta.calls
  return {
    device: {
      inputTokens: after.device.inputTokens - delta.inputTokens,
      outputTokens: after.device.outputTokens - delta.outputTokens,
      calls: after.device.calls - delta.calls,
      kindCalls,
    },
    total: {
      inputTokens: after.total.inputTokens - delta.inputTokens,
      outputTokens: after.total.outputTokens - delta.outputTokens,
    },
    bonusWeighted: after.bonusWeighted,
  }
}

/** The delta that undoes one, for a reservation that was refused. */
export function reverseDelta(delta: UsageDelta): UsageDelta {
  return {
    counters: delta.counters,
    calls: -delta.calls,
    inputTokens: -delta.inputTokens,
    outputTokens: -delta.outputTokens,
  }
}

/**
 * Reserved headroom: generation-heavy kinds stop at budget − reserve; the
 * protected in-activity kinds may spend up to the full budget, so an activity
 * in progress can always finish its responsive pieces.
 */
export function checkBudget(
  kind: string,
  usage: UsageRecord,
  opts: { repair?: boolean; total?: TokenTotals; bonusWeighted?: number } = {},
): BudgetDecision {
  const limit = deviceLimit(opts.bonusWeighted)
  const counters = opts.repair ? [kind, REPAIR_COUNTER] : [kind]
  for (const counter of counters) {
    const burst = burstLimit(counter, opts.bonusWeighted)
    if (burst !== undefined && (usage.kindCalls[counter] ?? 0) >= burst) {
      return { allowed: false, reason: 'kind_limit_reached' }
    }
  }
  // A code raises one device's ceiling; it can't lift the proxy-wide one.
  if (opts.total && weightedUsed(opts.total) >= GLOBAL_DAILY_BUDGET_WEIGHTED) {
    return { allowed: false, reason: 'service_limit_reached' }
  }
  const used = weightedUsed(usage)
  const ceiling = PROTECTED_KINDS.has(kind) ? limit : limit - RESERVED_WEIGHTED
  if (used >= ceiling) return { allowed: false, reason: 'budget_exhausted' }
  return { allowed: true }
}

/** The device's own daily ceiling: the included amount plus any granted by code. */
export function deviceLimit(bonusWeighted = 0): number {
  return DAILY_BUDGET_WEIGHTED + Math.max(0, bonusWeighted)
}

/**
 * Burst limits scale with the grant, in the same proportion. A code that
 * doubles the tokens has to double the per-kind headroom too, or the kind
 * limits stop the extra budget from ever being spendable — `intake.outcomes`
 * at 10/day binds long before 500,000 weighted tokens do.
 */
function burstLimit(counter: string, bonusWeighted = 0): number | undefined {
  const base = BURST_LIMITS[counter]
  if (base === undefined) return undefined
  return Math.floor((base * deviceLimit(bonusWeighted)) / DAILY_BUDGET_WEIGHTED)
}

/**
 * Remaining-budget headers the app mirrors in Me → AI usage. The limit is the
 * device's own, so a redeemed code needs no arithmetic on the client.
 */
export function budgetHeaders(
  usage: UsageRecord,
  nowMs: number,
  bonusWeighted = 0,
): Record<string, string> {
  const limit = deviceLimit(bonusWeighted)
  const used = weightedUsed(usage)
  return {
    'x-budget-limit': String(limit),
    'x-budget-used': String(Math.min(used, limit)),
    'x-budget-remaining': String(Math.max(0, limit - used)),
    'x-budget-reset': nextUtcMidnight(nowMs),
  }
}
