import { useEffect, useState } from 'react'
import { Linking, Text, View } from 'react-native'

import { BYOK_AVAILABLE, getAiMode, setAiMode, type AiMode } from '@/ai/settings'
import { KEYS, secureDelete, secureGet, secureSet } from '@/ai/secure-store'
import { CodeError, fetchUsage, redeemCode, type UsageSnapshot } from '@/ai/usage'
import { ReplayMask, track } from '@/analytics'
import { Button } from '@/components/button'
import { Meter } from '@/components/meter'
import { SubScreen } from '@/components/sub-screen'
import { TextField } from '@/components/text-field'
import { FEEDBACK_CONTACT } from '@/feedback/use-feedback'

/**
 * Me → Settings → AI (docs/01 §7): today's usage against the included daily
 * amount, a code field for the extra allowance we hand out during the beta,
 * and the option to bring your own Anthropic key (D10 — SecureStore, calls go
 * direct and unmetered). Native only: web has no keychain.
 */

export default function AiScreen() {
  const [usage, setUsage] = useState<UsageSnapshot | null>(null)
  const [usageError, setUsageError] = useState(false)
  const [byok, setByok] = useState<boolean | null>(null)
  const [key, setKey] = useState('')
  const [code, setCode] = useState('')
  const [codeStatus, setCodeStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const mode: AiMode = getAiMode()

  useEffect(() => {
    let live = true
    if (BYOK_AVAILABLE) {
      void secureGet(KEYS.byokKey).then((stored) => {
        if (live) setByok(stored !== null)
      })
    }
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

  const applyCode = async () => {
    const trimmed = code.trim()
    if (trimmed.length === 0 || redeeming) return
    setRedeeming(true)
    setCodeStatus(null)
    try {
      await redeemCode(trimmed)
      setCode('')
      setCodeStatus({ ok: true, message: 'Added. Your daily amount is higher from now on.' })
      // The meter is the proof, so re-read it rather than doing the sum here.
      setUsage(await fetchUsage())
    } catch (e) {
      setCodeStatus({
        ok: false,
        message: e instanceof CodeError ? e.message : "That code didn't work.",
      })
    } finally {
      setRedeeming(false)
    }
  }

  const saveKey = async () => {
    const trimmed = key.trim()
    if (trimmed.length === 0) return
    await secureSet(KEYS.byokKey, trimmed)
    setAiMode('byok')
    track('byok_enabled')
    track('settings_changed', { key: 'ai_mode' })
    setKey('')
    setByok(true)
  }

  const removeKey = async () => {
    await secureDelete(KEYS.byokKey)
    if (getAiMode() === 'byok') {
      setAiMode('proxy')
      track('settings_changed', { key: 'ai_mode' })
    }
    setByok(false)
  }

  return (
    <SubScreen title="AI">
      <Text className="font-sans text-body leading-relaxed text-ink-soft">
        Your path and activities are written by AI. It can get facts wrong or explain things poorly.
        If something looks off, tell us with the feedback button.
      </Text>

      {mode === 'byok' ? (
        <Text className="font-sans text-body text-ink-soft">
          Your own key is in use, so we don&apos;t meter these calls.
        </Text>
      ) : mode === 'fixture' ? (
        <Text className="font-sans text-body text-ink-soft">
          Fixture mode is replaying recorded responses. Nothing is metered.
        </Text>
      ) : (
        <View className="gap-3">
          {usage ? (
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
          <Text className="font-sans text-secondary leading-relaxed text-ink-soft">
            Daily limit to keep costs sustainable. If you&apos;re running into the limit often,
            think there are issues, or need any more, don&apos;t hesitate to reach out to{' '}
            <Text
              className="text-cornflower-deep"
              accessibilityRole="link"
              onPress={() => void Linking.openURL(`mailto:${FEEDBACK_CONTACT}`)}
            >
              {FEEDBACK_CONTACT}
            </Text>
            .
          </Text>
        </View>
      )}

      {mode === 'proxy' ? (
        <View className="gap-3">
          <Text className="font-heading-bold text-heading text-ink">Have a code?</Text>
          <TextField
            value={code}
            onChangeText={(next) => {
              setCode(next)
              setCodeStatus(null)
            }}
            placeholder="XXXX-XXXX-XXXX"
            accessibilityLabel="Extra usage code"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button
            label={redeeming ? 'Adding…' : 'Add code'}
            onPress={() => void applyCode()}
            disabled={code.trim() === '' || redeeming}
          />
          {codeStatus ? (
            <Text
              className={`font-sans text-secondary ${codeStatus.ok ? 'text-ink-soft' : 'text-peach'}`}
            >
              {codeStatus.message}
            </Text>
          ) : null}
        </View>
      ) : null}

      {BYOK_AVAILABLE ? (
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
              <ReplayMask>
                <TextField
                  value={key}
                  onChangeText={setKey}
                  placeholder="sk-ant-…"
                  accessibilityLabel="Anthropic API key"
                />
              </ReplayMask>
              <Button
                label="Save key"
                onPress={() => void saveKey()}
                disabled={key.trim() === ''}
              />
            </>
          )}
        </View>
      ) : null}
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
