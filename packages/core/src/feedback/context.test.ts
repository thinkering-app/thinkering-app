import { describe, expect, it } from 'vitest'
import {
  coarseScreen,
  featurebasePortalUrl,
  sanitizeFeedbackContext,
  type FeedbackContext,
} from './context'

describe('coarseScreen', () => {
  it('names the screen without its ids or groups', () => {
    expect(coarseScreen('/(tabs)/today')).toBe('today')
    expect(coarseScreen('/activity/0199a0f0-8b6c-7000-8000-000000000001')).toBe('activity')
    expect(coarseScreen('/path/settings?interestId=0199a0f0')).toBe('settings')
    expect(coarseScreen('/me/ai')).toBe('ai-usage')
    expect(coarseScreen('/')).toBe('today')
  })

  it('refuses to pass through a route it does not know', () => {
    expect(coarseScreen('/admin/secret-thing')).toBe('unknown')
    expect(coarseScreen('/ai-inspector/0199a0f0')).toBe('unknown')
  })
})

describe('sanitizeFeedbackContext', () => {
  it('keeps only the three allowlisted values', () => {
    const context = sanitizeFeedbackContext({
      screen: '/activity/0199a0f0',
      platform: 'ios',
      appVersion: '0.1.2',
      // @ts-expect-error -- the point of the allowlist: extra keys cannot survive
      email: 'someone@example.com',
      interest: 'Conversational German',
    })
    expect(context).toEqual({ screen: 'activity', platform: 'ios', appVersion: '0.1.2' })
  })

  it('replaces anything unrecognised rather than forwarding it', () => {
    expect(
      sanitizeFeedbackContext({ screen: 'x', platform: 'toaster', appVersion: '/Users/reb/build' }),
    ).toEqual({ screen: 'unknown', platform: 'unknown', appVersion: 'unknown' })
    expect(sanitizeFeedbackContext({}).appVersion).toBe('unknown')
  })
})

describe('featurebasePortalUrl', () => {
  const context: FeedbackContext = { screen: 'today', platform: 'ios', appVersion: '0.1.0' }

  it('attaches exactly the allowlisted metadata', () => {
    const href = featurebasePortalUrl('https://thinkering.featurebase.app/', context)
    const url = new URL(href!)
    expect(url.origin + url.pathname).toBe('https://thinkering.featurebase.app/')
    expect(url.searchParams.get('hideLogo')).toBe('true')
    expect(JSON.parse(url.searchParams.get('metaData')!)).toEqual(context)
  })

  it('keeps a board path and replaces stale metadata', () => {
    const href = featurebasePortalUrl(
      'https://thinkering.featurebase.app/help?metaData=%7B%22plan%22%3A%22pro%22%7D',
      context,
    )
    const url = new URL(href!)
    expect(url.pathname).toBe('/help')
    expect(JSON.parse(url.searchParams.get('metaData')!)).toEqual(context)
  })

  it('is null when unconfigured or not https', () => {
    expect(featurebasePortalUrl(undefined, context)).toBeNull()
    expect(featurebasePortalUrl('   ', context)).toBeNull()
    expect(featurebasePortalUrl('http://thinkering.featurebase.app', context)).toBeNull()
    expect(featurebasePortalUrl('not a url', context)).toBeNull()
  })
})
