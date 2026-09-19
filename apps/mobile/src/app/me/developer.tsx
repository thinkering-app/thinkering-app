import { router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { seedFixtureData } from '@thinkering/db'

import { AI_MODES, DEV_TOOLS, getAiMode, setAiMode, type AiMode } from '@/ai/settings'
import { Button } from '@/components/button'
import { confirmDestructive } from '@/components/confirm'
import { NavRow } from '@/components/nav-row'
import { Pill } from '@/components/pill'
import { SubScreen } from '@/components/sub-screen'
import { Toast } from '@/components/toast'
import { db, repoContext } from '@/db'
import { reopenAt, resetLocalData } from '@/dev/data'
import { useLocalToday } from '@/time'

/**
 * Me → Settings → Developer (docs/02 §Dev experience). The Inspector is here
 * whenever it is enabled; switching AI mode and loading or clearing data need
 * `DEV_TOOLS`, so a production user who finds the hidden toggle gets the
 * read-only half and nothing that rewrites their data.
 */

export default function DeveloperScreen() {
  const today = useLocalToday()
  const [mode, setMode] = useState<AiMode>(() => getAiMode())
  const [toast, setToast] = useState<string | null>(null)

  async function startOver(seed: boolean) {
    const confirmed = await confirmDestructive({
      title: seed ? 'Replace everything with fixture data?' : 'Clear all data?',
      message: 'Everything on this device goes. A backup on the server is left alone.',
      confirmLabel: seed ? 'Replace' : 'Clear',
    })
    if (!confirmed) return
    resetLocalData({ seed, today })
    reopenAt(seed ? '/today' : '/intake/welcome')
  }

  return (
    <SubScreen title="Developer">
      <NavRow label="AI Inspector" onPress={() => router.push('/ai-inspector')} />

      {DEV_TOOLS ? (
        <>
          <View className="gap-3">
            <Text className="font-heading-bold text-heading text-ink">AI mode</Text>
            <Text className="font-sans text-secondary text-ink-soft">
              Applies to the next generation. Existing activities are left as they are.
            </Text>
            <View className="flex-row gap-2">
              {AI_MODES.map((m) => (
                <Pill
                  key={m}
                  label={m}
                  selected={mode === m}
                  onPress={() => {
                    setAiMode(m)
                    setMode(m)
                  }}
                />
              ))}
            </View>
          </View>

          <Button
            label="Load fixture data"
            variant="quiet"
            onPress={() => {
              const seeded = seedFixtureData(db, repoContext, { today })
              setToast(seeded ? 'Fixture data loaded' : 'Fixture data is already here')
            }}
          />

          <Button
            label="Start over with fixture data"
            variant="quiet"
            onPress={() => void startOver(true)}
          />

          <Button label="Clear all data" variant="quiet" onPress={() => void startOver(false)} />
        </>
      ) : null}

      <Toast message={toast} onHide={() => setToast(null)} />
    </SubScreen>
  )
}
