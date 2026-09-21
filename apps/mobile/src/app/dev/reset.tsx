import { router, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'

import { DEV_TOOLS } from '@/ai/settings'
import { resetLocalData } from '@/dev/data'
import { applyDevSetup, hasDevParam } from '@/dev/dev-link'
import { reopenAt } from '@/reopen'
import { useLocalToday } from '@/time'

/**
 * Deep-linked start-over (docs/10 Tier 6): `thinkering://dev/reset` empties the
 * database and lands on the intake welcome; `dev/reset?seed=1` refills it with
 * the fixture interest and lands on Today. On web the same paths work as URLs,
 * and `?dev` survives the reset (`@/dev/dev-link`).
 * Only with `DEV_TOOLS` — anywhere else it's a redirect home.
 */
export default function DevReset() {
  const today = useLocalToday()
  const { seed } = useLocalSearchParams<{ seed?: string }>()
  const withSeed = seed === '1'

  useEffect(() => {
    if (!DEV_TOOLS) {
      router.replace('/')
      return
    }
    resetLocalData({ seed: withSeed, today })
    // The reset took the settings with it; put a `?dev` link's back.
    if (hasDevParam()) applyDevSetup()
    reopenAt(withSeed ? '/today' : '/intake/welcome')
  }, [today, withSeed])

  return null
}
