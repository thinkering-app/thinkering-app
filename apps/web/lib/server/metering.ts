import type { UsageRecord } from './store'

/**
 * Budget math (D14, docs/04 §Usage metering). Weighted tokens: output ×4
 * input; cached input ~free (not counted). Sized for roughly 60 generations a
 * day, with a reserved slice so in-activity calls (G6 review, G7 Ask) never
 * starve. Metering days are UTC (D12's device-local day is a UI concept).
 */

export const DAILY_BUDGET_WEIGHTED = 500_000
/** Slice only activity.review / activity.question may spend into. */
export const RESERVED_WEIGHTED = 75_000
export const OUTPUT_WEIGHT = 4

/** In-activity kinds that draw from the protected slice. */
export const PROTECTED_KINDS = new Set(['activity.review', 'activity.question'])

/** Per-kind daily burst limits to prevent abuse of the expensive kinds. */
export const BURST_LIMITS: Record<string, number> = {
  'intake.approach': 10,
  'intake.topics': 10,
  'intake.success': 10,
  'intake.path': 15,
  'resources.search': 10,
  'activity.generate': 80,
  'today.plan': 60,
  'reflect.update': 15,
  'resource.describe': 40,
  /** Not a model call — the page fetch behind add-by-link, limited for the same reason. */
  'fetch.url': 60,
}

export function weightedUsed(usage: UsageRecord): number {
  return usage.inputTokens + OUTPUT_WEIGHT * usage.outputTokens
}

export function utcDayOf(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10)
}

export function nextUtcMidnight(nowMs: number): string {
  const d = new Date(nowMs)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString()
}

export type BudgetDecision =
  { allowed: true } | { allowed: false; reason: 'budget_exhausted' | 'kind_limit_reached' }

/**
 * Reserved headroom: generation-heavy kinds stop at budget − reserve; the
 * protected in-activity kinds may spend up to the full budget, so an activity
 * in progress can always finish its responsive pieces.
 */
export function checkBudget(kind: string, usage: UsageRecord): BudgetDecision {
  const kindCalls = usage.kindCalls[kind] ?? 0
  const limit = BURST_LIMITS[kind]
  if (limit !== undefined && kindCalls >= limit) {
    return { allowed: false, reason: 'kind_limit_reached' }
  }
  const used = weightedUsed(usage)
  const ceiling = PROTECTED_KINDS.has(kind)
    ? DAILY_BUDGET_WEIGHTED
    : DAILY_BUDGET_WEIGHTED - RESERVED_WEIGHTED
  if (used >= ceiling) return { allowed: false, reason: 'budget_exhausted' }
  return { allowed: true }
}

/** Remaining-budget headers the app mirrors in Me → AI usage. */
export function budgetHeaders(usage: UsageRecord, nowMs: number): Record<string, string> {
  const used = weightedUsed(usage)
  return {
    'x-budget-limit': String(DAILY_BUDGET_WEIGHTED),
    'x-budget-used': String(Math.min(used, DAILY_BUDGET_WEIGHTED)),
    'x-budget-remaining': String(Math.max(0, DAILY_BUDGET_WEIGHTED - used)),
    'x-budget-reset': nextUtcMidnight(nowMs),
  }
}
