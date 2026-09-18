import { router } from 'expo-router'
import { useEffect } from 'react'
import { seedFixtureData } from '@thinkering/db'

import { BUILD_AI_MODE } from '@/ai/settings'
import { db, repoContext } from '@/db'
import { useLocalToday } from '@/time'

/**
 * Deep-linked seeding (docs/10 Tier 6): `thinkering://dev/seed` — or
 * `exp://<metro>/--/dev/seed` under Expo Go — writes the fixture interest and
 * lands on Today. It exists so an iOS change can be looked at in a seeded app
 * in a second, instead of replaying intake or running a Maestro flow.
 *
 * Reachable in dev, and in a build made in fixture mode (the `e2e` EAS
 * profile). Gated on the build rather than on `getAiMode()`, which reads a
 * setting the user's device may carry over from an earlier dev install:
 * `EXPO_PUBLIC_AI_MODE` is inlined at bundle time and unset in every other EAS
 * profile, so a production build can never reach this route.
 */
export default function DevSeed() {
  const today = useLocalToday()
  const allowed = __DEV__ || BUILD_AI_MODE === 'fixture'

  useEffect(() => {
    // Idempotent per interest name, so a re-entered link is a no-op.
    if (allowed) seedFixtureData(db, repoContext, { today })
    router.replace(allowed ? '/today' : '/')
  }, [allowed, today])

  return null
}
