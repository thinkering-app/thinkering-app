import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_EVENT_PROPERTIES,
  daysSinceInstallBucket,
  durationBucket,
  latencyBucket,
  sanitizeAnalyticsProperties,
} from './events'

const DAY = 24 * 60 * 60 * 1000

describe('buckets', () => {
  it('coarsens durations at the bucket edges', () => {
    expect(durationBucket(0)).toBe('<10s')
    expect(durationBucket(9_999)).toBe('<10s')
    expect(durationBucket(10_000)).toBe('10-30s')
    expect(durationBucket(60_000)).toBe('1-3m')
    expect(durationBucket(44 * 60_000)).toBe('20-45m')
    expect(durationBucket(45 * 60_000)).toBe('45m+')
  })

  it('never reports a raw millisecond value it cannot bucket', () => {
    expect(durationBucket(Number.NaN)).toBe('<10s')
    expect(durationBucket(-5)).toBe('<10s')
    expect(latencyBucket(Number.POSITIVE_INFINITY)).toBe('30s+')
  })

  it('coarsens latencies', () => {
    expect(latencyBucket(499)).toBe('<500ms')
    expect(latencyBucket(1_000)).toBe('1-2s')
    expect(latencyBucket(29_999)).toBe('10-30s')
    expect(latencyBucket(30_000)).toBe('30s+')
  })

  it('coarsens days since install, and reads a backwards clock as day 0', () => {
    const now = 1_760_000_000_000
    expect(daysSinceInstallBucket(now, now)).toBe('0')
    expect(daysSinceInstallBucket(now - DAY, now)).toBe('1-6')
    expect(daysSinceInstallBucket(now - 7 * DAY, now)).toBe('7-29')
    expect(daysSinceInstallBucket(now - 200 * DAY, now)).toBe('90+')
    expect(daysSinceInstallBucket(now + DAY, now)).toBe('0')
  })
})

describe('sanitizeAnalyticsProperties', () => {
  it('keeps the declared properties', () => {
    expect(
      sanitizeAnalyticsProperties('activity_completed', {
        section: 'next',
        tier: 'introduce',
        library_item_id: 'worked_example',
        duration_bucket: '3-10m',
        pages: 6,
        questions_asked_count: 0,
        rating: 'up',
      }),
    ).toEqual({
      section: 'next',
      tier: 'introduce',
      library_item_id: 'worked_example',
      duration_bucket: '3-10m',
      pages: 6,
      questions_asked_count: 0,
      rating: 'up',
    })
  })

  it('drops anything the schema does not declare', () => {
    expect(
      sanitizeAnalyticsProperties('question_asked', {
        tier: 'apply',
        question: 'why does the dative case exist',
        interest_name: 'Conversational German',
      }),
    ).toEqual({ tier: 'apply' })
  })

  it('drops values that are the shape a leak would take', () => {
    expect(
      sanitizeAnalyticsProperties('ai_call', {
        kind: 'activity.generate',
        model: { id: 'claude-sonnet-5' },
        latency_bucket: 'x'.repeat(200),
        status: 'ok',
      }),
    ).toEqual({ kind: 'activity.generate', status: 'ok' })
  })

  it('refuses an event name that is not in the schema', () => {
    expect(sanitizeAnalyticsProperties('user_typed_something', { text: 'hello' })).toEqual({})
  })
})

describe('the schema table', () => {
  it('never lists a property twice', () => {
    for (const name of ANALYTICS_EVENT_NAMES) {
      const keys = ANALYTICS_EVENT_PROPERTIES[name]
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('has no property whose name suggests content', () => {
    const banned = /(^|_)(name|title|text|url|email|query|label|content|id)$/
    const offenders = ANALYTICS_EVENT_NAMES.flatMap((name) =>
      ANALYTICS_EVENT_PROPERTIES[name]
        .filter((key) => banned.test(key))
        // library_item_id is one of our own library ids (docs/06), not user content.
        .filter((key) => key !== 'library_item_id'),
    )
    expect(offenders).toEqual([])
  })
})
