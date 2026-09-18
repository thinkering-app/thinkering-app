import { router } from 'expo-router'
import { useEffect } from 'react'
import { seedFixtureData } from '@thinkering/db'

import { DEV_TOOLS } from '@/ai/settings'
import { db, repoContext } from '@/db'
import { useLocalToday } from '@/time'

/**
 * Deep-linked seeding (docs/10 Tier 6): `thinkering://dev/seed` — or
 * `exp://<metro>/--/dev/seed` under Expo Go — writes the fixture interest and
 * lands on Today. It exists so an iOS change can be looked at in a seeded app
 * in a second, instead of replaying intake or running a Maestro flow.
 *
 * Adds to whatever is there; `dev/reset?seed=1` starts from empty instead.
 * Reachable only with `DEV_TOOLS`, which a production build never has.
 */
export default function DevSeed() {
  const today = useLocalToday()

  useEffect(() => {
    // Idempotent per interest name, so a re-entered link is a no-op.
    if (DEV_TOOLS) seedFixtureData(db, repoContext, { today })
    router.replace(DEV_TOOLS ? '/today' : '/')
  }, [today])

  return null
}
