import { useEffect, useState } from 'react'
import { Platform, Switch, Text, View } from 'react-native'

import { getAiMode, setAiMode, type AiMode } from '@/ai/settings'
import { KEYS, secureDelete, secureGet, secureSet } from '@/ai/secure-store'
import { fetchUsage, type UsageSnapshot } from '@/ai/usage'
import { isAnalyticsOptedIn, setAnalyticsOptIn } from '@/analytics/consent'
import { Button } from '@/components/button'
import { Meter } from '@/components/meter'
import { SubScreen } from '@/components/sub-screen'
import { TextField } from '@/components/text-field'
import { colors } from '@/theme/tokens'

/**
 * Me → AI usage (docs/01 §7): today's usage against the included daily amount,
 * the option to bring your own Anthropic key (D10 — SecureStore, calls go
 * direct and unmetered), and the anonymous-analytics opt-in (D9).
 */

export default function AiUsageScreen() {
  const [usage, setUsage] = useState<UsageSnapshot | null>(null)
  const [usageError, setUsageError] = useState(false)
  const [byok, setByok] = useState<boolean | null>(null)
  const [key, setKey] = useState('')
  const [optedIn, setOptedIn] = useState(() => isAnalyticsOptedIn())
  const mode: AiMode = getAiMode()

  useEffect(() => {
    let live = true
    void secureGet(KEYS.byokKey).then((stored) => {
      if (live) setByok(stored !== null)
    })
    // Only the metered proxy has a meter: a BYO key is billed by Anthropic, and
    // fixture mode never touches the network (docs/10).
    if (mode === 'proxy') {
      fetchUsage().then(
        (snapshot) => live && setUsage(snapshot),
        () => live && setUsageError(true),
      )
    }
    return () => {
      live = false
    }
  }, [mode])

  const saveKey = async () => {
    const trimmed = key.trim()
    if (trimmed.length === 0) return
    await secureSet(KEYS.byokKey, trimmed)
    setAiMode('byok')
    setKey('')
    setByok(true)
  }

  const removeKey = async () => {
    await secureDelete(KEYS.byokKey)
    if (getAiMode() === 'byok') setAiMode('proxy')
    setByok(false)
  }

  return (
    <SubScreen title="AI usage">
      {mode === 'byok' ? (
        <Text className="font-sans text-body text-ink-soft">
          Your own key is in use, so we don&apos;t meter these calls.
        </Text>
      ) : mode === 'fixture' ? (
        <Text className="font-sans text-body text-ink-soft">
          Fixture mode is replaying recorded responses. Nothing is metered.
        </Text>
      ) : usage ? (
        <Meter
          label="Used today"
          fraction={usage.used / usage.limit}
          caption={`Resets ${resetLabel(usage.resetAt)}`}
        />
      ) : usageError ? (
        <Text className="font-sans text-body text-ink-soft">
          We couldn&apos;t reach the usage meter.
        </Text>
      ) : (
        <Text className="font-sans text-body text-ink-soft">Checking today&apos;s usage…</Text>
      )}

      <View className="gap-3">
        <Text className="font-heading-bold text-heading text-ink">Your own Anthropic key</Text>
        {byok ? (
          <>
            <Text className="font-sans text-secondary text-ink-soft">
              A key is saved on this device. Calls go straight to Anthropic.
            </Text>
            <Button label="Remove key" variant="quiet" onPress={() => void removeKey()} />
          </>
        ) : (
          <>
            <TextField
              value={key}
              onChangeText={setKey}
              placeholder="sk-ant-…"
              accessibilityLabel="Anthropic API key"
            />
            {Platform.OS === 'web' ? (
              <Text className="font-sans text-caption text-ink-soft">
                On the web the key is kept in browser storage, which is less protected than the
                keychain on a phone.
              </Text>
            ) : null}
            <Button label="Save key" onPress={() => void saveKey()} disabled={key.trim() === ''} />
          </>
        )}
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-4">
          <Text className="flex-1 font-sans text-body text-ink">
            Share anonymous usage to improve thinkering
          </Text>
          <Switch
            value={optedIn}
            onValueChange={(next) => {
              setAnalyticsOptIn(next)
              setOptedIn(next)
            }}
            trackColor={{ false: colors.hairline, true: colors.cornflower.DEFAULT }}
            thumbColor={colors.surface}
          />
        </View>
        <Text className="font-sans text-caption text-ink-soft">
          Counts and ratings only — never what you write, learn, or look at. Not linked to you.
        </Text>
      </View>
    </SubScreen>
  )
}

/** The daily budget resets at UTC midnight; the label says it in local time. */
function resetLabel(resetAt: string): string {
  const at = Date.parse(resetAt)
  if (Number.isNaN(at)) return 'daily'
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(at),
  )
}
