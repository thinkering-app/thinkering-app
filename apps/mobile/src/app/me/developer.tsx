import { router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { seedFixtureData } from '@thinkering/db'

import { getAiMode, setAiMode, type AiMode } from '@/ai/settings'
import { Button } from '@/components/button'
import { NavRow } from '@/components/nav-row'
import { Pill } from '@/components/pill'
import { SubScreen } from '@/components/sub-screen'
import { Toast } from '@/components/toast'
import { db, repoContext } from '@/db'
import { useLocalToday } from '@/time'

/**
 * Me → Settings → Developer (docs/02 §Dev experience). The Inspector is here
 * whenever it is enabled; switching AI mode and seeding fixture data are dev
 * builds only, so a production user who finds the hidden toggle gets the
 * read-only half and nothing that rewrites their data.
 */

const MODES: AiMode[] = ['proxy', 'byok', 'fixture']

export default function DeveloperScreen() {
  const today = useLocalToday()
  const [mode, setMode] = useState<AiMode>(() => getAiMode())
  const [toast, setToast] = useState<string | null>(null)

  return (
    <SubScreen title="Developer">
      <NavRow label="AI Inspector" onPress={() => router.push('/ai-inspector')} />

      {__DEV__ ? (
        <>
          <View className="gap-3">
            <Text className="font-heading-bold text-heading text-ink">AI mode</Text>
            <Text className="font-sans text-secondary text-ink-soft">
              Applies to the next generation. Existing activities are left as they are.
            </Text>
            <View className="flex-row gap-2">
              {MODES.map((m) => (
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
        </>
      ) : null}

      <Toast message={toast} onHide={() => setToast(null)} />
    </SubScreen>
  )
}
