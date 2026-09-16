import { router } from 'expo-router'
import { useEffect } from 'react'
import { seedFixtureData } from '@thinkering/db'

import { getAiMode } from '@/ai/settings'
import { db, repoContext } from '@/db'
import { useLocalToday } from '@/time'

/**
 * Deep-linked seeding (docs/10 Tier 6): `thinkering://dev/seed` — or
 * `exp://<metro>/--/dev/seed` under Expo Go — writes the fixture interest and
 * lands on Today. It exists so an iOS change can be looked at in a seeded app
 * in a second, instead of replaying intake or running a Maestro flow.
 *
 * Reachable in dev, and in a fixture-mode build (the `e2e` EAS profile). Not
 * reachable in production: fixture mode is only selectable from the Me screen's
 * `__DEV__` panel, and `EXPO_PUBLIC_AI_MODE` is unset in every other EAS
 * profile, so `getAiMode()` there can only be proxy or byok.
 */
export default function DevSeed() {
  const today = useLocalToday()
  const allowed = __DEV__ || getAiMode() === 'fixture'

  useEffect(() => {
    // Idempotent per interest name, so a re-entered link is a no-op.
    if (allowed) seedFixtureData(db, repoContext, { today })
    router.replace(allowed ? '/today' : '/')
  }, [allowed, today])

  return null
}
