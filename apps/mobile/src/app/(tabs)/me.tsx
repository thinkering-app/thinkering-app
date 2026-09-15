import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { localDateOf } from '@thinkering/core'
import { seedFixtureData } from '@thinkering/db'

import { Button } from '@/components/button'
import { Pill } from '@/components/pill'
import { Screen } from '@/components/screen'
import { db, repoContext } from '@/db'
import {
  getAiMode,
  isInspectorEnabled,
  setAiMode,
  setInspectorEnabled,
  type AiMode,
} from '@/ai/settings'

const MODES: AiMode[] = ['proxy', 'byok', 'fixture']

export default function MeScreen() {
  const [seeded, setSeeded] = useState(false)
  const [mode, setMode] = useState<AiMode>(() => getAiMode())
  const [inspector, setInspector] = useState(() => isInspectorEnabled())

  return (
    <Screen title="Me">
      <View className="flex-1 gap-3">
        {__DEV__ ? (
          <>
            <Text className="font-sans-semibold text-secondary text-ink">AI mode</Text>
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
            <Button
              label={seeded ? 'Fixture data loaded' : 'Load fixture data'}
              variant="quiet"
              onPress={() => {
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
                seedFixtureData(db, repoContext, { today: localDateOf(Date.now(), timeZone) })
                setSeeded(true)
              }}
            />
          </>
        ) : null}
        {inspector ? (
          <Button label="AI Inspector" variant="quiet" onPress={() => router.push('/ai-inspector')} />
        ) : null}
      </View>
      {/* Hidden toggle (docs/02): long-press the version line to reveal the Inspector in production builds. */}
      <Pressable
        onLongPress={() => {
          const next = !isInspectorEnabled()
          setInspectorEnabled(next)
          setInspector(__DEV__ || next)
        }}
        delayLongPress={1500}
        className="items-center pb-2"
      >
        <Text className="font-sans text-caption text-ink-soft">thinkering 0.0.0</Text>
      </Pressable>
    </Screen>
  )
}
