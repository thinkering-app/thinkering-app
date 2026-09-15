/**
 * What may travel with feedback (docs/01 §2, docs/08): a coarse screen name,
 * the platform, and the app version. Nothing else — no route ids, no interest
 * or activity names, no device or account identity. Both feedback channels
 * build their context here so the allowlist has one implementation.
 */

export const FEEDBACK_SCREENS = [
  'today',
  'path',
  'history',
  'me',
  'intake',
  'activity',
  'resources',
  'reflect',
  'settings',
  'interests',
  'ai-usage',
  'privacy',
  'feedback',
  'unknown',
] as const
export type FeedbackScreen = (typeof FEEDBACK_SCREENS)[number]

export const FEEDBACK_PLATFORMS = ['ios', 'android', 'web', 'unknown'] as const
export type FeedbackPlatform = (typeof FEEDBACK_PLATFORMS)[number]

export interface FeedbackContext {
  screen: FeedbackScreen
  platform: FeedbackPlatform
  /** A release version, or `unknown` — never a build path or commit. */
  appVersion: string
}

/** Route → coarse screen. Anything unlisted is `unknown` rather than leaked. */
const ROUTES: Record<string, FeedbackScreen> = {
  '': 'today',
  today: 'today',
  path: 'path',
  history: 'history',
  me: 'me',
  intake: 'intake',
  activity: 'activity',
  'path/resources': 'resources',
  'path/reflect': 'reflect',
  'path/settings': 'settings',
  'me/interests': 'interests',
  'me/ai-usage': 'ai-usage',
  'me/privacy': 'privacy',
}

const VERSION = /^\d+(\.\d+){0,2}(-[A-Za-z0-9.]+)?$/

/**
 * The coarse screen behind a router pathname. Ids, query strings and group
 * segments are dropped before matching — `/activity/0199…` is `activity`, and
 * an unknown route never contributes its own text.
 */
export function coarseScreen(pathname: string): FeedbackScreen {
  const segments = pathname
    .split(/[?#]/)[0]!
    .split('/')
    .filter((part) => part.length > 0 && !part.startsWith('('))
  // Two segments then one: the sub-route wins when it has its own name.
  const candidates = [segments.slice(0, 2).join('/'), segments[0] ?? '']
  for (const candidate of candidates) {
    const screen = ROUTES[candidate]
    if (screen) return screen
  }
  return 'unknown'
}

export function sanitizeFeedbackContext(input: {
  screen?: string
  platform?: string
  appVersion?: string
}): FeedbackContext {
  const screen = FEEDBACK_SCREENS.find((s) => s === input.screen)
  const platform = FEEDBACK_PLATFORMS.find((p) => p === input.platform)
  const appVersion = input.appVersion?.trim() ?? ''
  return {
    screen: screen ?? coarseScreen(input.screen ?? ''),
    platform: platform ?? 'unknown',
    appVersion: VERSION.test(appVersion) ? appVersion : 'unknown',
  }
}

/**
 * The Featurebase portal URL with our metadata attached. Featurebase reads a
 * `metaData` query parameter of stringified JSON and attaches it to whatever
 * the user posts from that session, so exactly the allowlisted three keys go
 * in. Returns null when the portal isn't configured or isn't an https URL —
 * the community option then hides rather than opening something unexpected.
 */
export function featurebasePortalUrl(
  portalUrl: string | undefined,
  context: FeedbackContext,
): string | null {
  if (!portalUrl || portalUrl.trim().length === 0) return null
  let url: URL
  try {
    url = new URL(portalUrl.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  url.searchParams.set('hideLogo', 'true')
  url.searchParams.set(
    'metaData',
    JSON.stringify({
      screen: context.screen,
      platform: context.platform,
      appVersion: context.appVersion,
    }),
  )
  return url.toString()
}
