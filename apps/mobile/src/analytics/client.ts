import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { PostHog } from 'posthog-react-native'
import { getSetting, setSetting } from '@thinkering/db'
import { db } from '@/db'

/**
 * The PostHog client (docs/08). Constructed lazily and only after consent —
 * before that nothing here runs, so the SDK never has a chance to send
 * anything. Autocapture, session replay, lifecycle events, surveys, feature
 * flags and GeoIP enrichment are all off: the only events that exist are the
 * ones the typed `track()` wrapper sends.
 *
 * `identify()` is never called. The distinct_id is the SDK's own locally
 * generated anonymous UUID, persisted in our settings table — telemetry stays
 * unlinked from a backup account (D9).
 */

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? ''
/** EU cloud by default — the privacy copy says where the data lands. */
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

const STORAGE_KEY = 'posthog_storage'

/** PostHog's own key/value store, kept in the settings table rather than a new file. */
const customStorage = {
  getItem: (key: string) => getSetting<string>(db, `${STORAGE_KEY}.${key}`) ?? null,
  setItem: (key: string, value: string) => setSetting(db, `${STORAGE_KEY}.${key}`, value),
}

export function isAnalyticsConfigured(): boolean {
  return API_KEY.length > 0
}

let client: PostHog | null = null

export function analyticsClient(): PostHog | null {
  if (!isAnalyticsConfigured()) return null
  client ??= new PostHog(API_KEY, {
    host: HOST,
    customStorage,
    // Everything ambient is off; the event schema in docs/08 is the whole
    // surface. Autocapture would need <PostHogProvider>, which we never render.
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    disableGeoip: true,
    disableSurveys: true,
    preloadFeatureFlags: false,
    // App properties are the two the schema already declares, nothing else.
    customAppProperties: {
      $app_version: appVersion(),
      $os_name: Platform.OS,
    },
  })
  return client
}

export function appVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown'
}
