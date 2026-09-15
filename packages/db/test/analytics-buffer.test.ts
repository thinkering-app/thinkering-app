import { describe, expect, it } from 'vitest'
import {
  BUFFER_MAX_EVENTS,
  BUFFER_WINDOW_MS,
  bufferAnalyticsEvent,
  clearAnalyticsBuffer,
  countBufferedEvents,
  listBufferedEvents,
} from '../src'
import { openTestDb, testContext } from './helpers'

/** The pre-consent buffer (D9): the first week or 300 events, then it stops. */

describe('analytics buffer', () => {
  it('keeps the earliest events and refuses more once full', () => {
    const { db } = openTestDb()
    const ctx = testContext()
    for (let i = 0; i < BUFFER_MAX_EVENTS; i++) {
      ctx.advance(1000)
      expect(bufferAnalyticsEvent(db, ctx, { event: 'question_asked', properties: { i } })).toBe(
        true,
      )
    }
    expect(bufferAnalyticsEvent(db, ctx, { event: 'cap_reached', properties: {} })).toBe(false)

    const buffered = listBufferedEvents(db)
    expect(buffered.length).toBe(BUFFER_MAX_EVENTS)
    expect(buffered[0]!.properties).toEqual({ i: 0 })
  })

  it('stops buffering once the window since the first event has passed', () => {
    const { db } = openTestDb()
    const ctx = testContext()
    bufferAnalyticsEvent(db, ctx, { event: 'app_opened', properties: { platform: 'ios' } })
    ctx.advance(BUFFER_WINDOW_MS)
    expect(bufferAnalyticsEvent(db, ctx, { event: 'intake_started', properties: {} })).toBe(true)
    ctx.advance(1)
    expect(bufferAnalyticsEvent(db, ctx, { event: 'intake_completed', properties: {} })).toBe(false)
    expect(countBufferedEvents(db)).toBe(2)
  })

  it('is emptied by a decline', () => {
    const { db } = openTestDb()
    const ctx = testContext()
    bufferAnalyticsEvent(db, ctx, { event: 'app_opened', properties: {} })
    clearAnalyticsBuffer(db)
    expect(listBufferedEvents(db)).toEqual([])
    // And buffering can start again from a clean window.
    expect(bufferAnalyticsEvent(db, ctx, { event: 'app_opened', properties: {} })).toBe(true)
  })
})
