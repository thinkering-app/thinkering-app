import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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
import { currentFormatLocale, t } from '@/i18n'

/**
 * Me → Settings → AI (docs/01 §7): today's usage against the included daily
 * amount, a code field for the extra allowance we hand out during the beta,
 * and the option to bring your own Anthropic key (D10 — SecureStore, calls go
 * direct and unmetered). Native only: web has no keychain.
 */

export default function AiScreen() {
  const { t } = useTranslation()
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
      setCodeStatus({ ok: true, message: t('me.ai.codeAdded') })
      // The meter is the proof, so re-read it rather than doing the sum here.
      setUsage(await fetchUsage())
    } catch (e) {
      setCodeStatus({
        ok: false,
        message: e instanceof CodeError ? e.message : t('me.ai.codeRejected'),
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
    <SubScreen title={t('me.ai.title')}>
      {mode === 'byok' ? (
        <Text className="font-sans text-body text-ink-soft">{t('me.ai.byokActive')}</Text>
      ) : mode === 'fixture' ? (
        <Text className="font-sans text-body text-ink-soft">{t('me.ai.fixtureMode')}</Text>
      ) : (
        <View className="gap-3">
          {usage ? (
            <Meter
              label={t('me.ai.usedToday')}
              fraction={usage.used / usage.limit}
              caption={resetLabel(usage.resetAt)}
            />
          ) : usageError ? (
            <Text className="font-sans text-body text-ink-soft">{t('me.ai.usageUnreachable')}</Text>
          ) : (
            <Text className="font-sans text-body text-ink-soft">{t('me.ai.checkingUsage')}</Text>
          )}
          <Text className="font-sans text-secondary leading-relaxed text-ink-soft">
            <Trans
              i18nKey="me.ai.limitNote"
              values={{ email: FEEDBACK_CONTACT }}
              components={{
                link: (
                  <Text
                    className="text-cornflower-deep"
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(`mailto:${FEEDBACK_CONTACT}`)}
                  />
                ),
              }}
            />
          </Text>
        </View>
      )}

      {mode === 'proxy' ? (
        <View className="gap-3">
          <Text className="font-heading-bold text-heading text-ink">{t('me.ai.codeHeading')}</Text>
          <TextField
            value={code}
            onChangeText={(next) => {
              setCode(next)
              setCodeStatus(null)
            }}
            placeholder="XXXX-XXXX-XXXX"
            accessibilityLabel={t('me.ai.codeAccessibilityLabel')}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button
            label={redeeming ? t('me.ai.codeAdding') : t('me.ai.addCode')}
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
          <Text className="font-heading-bold text-heading text-ink">
            {t('me.ai.ownKeyHeading')}
          </Text>
          {byok ? (
            <>
              <Text className="font-sans text-secondary text-ink-soft">{t('me.ai.keySaved')}</Text>
              <Button
                label={t('me.ai.removeKey')}
                variant="quiet"
                onPress={() => void removeKey()}
              />
            </>
          ) : (
            <>
              <ReplayMask>
                <TextField
                  value={key}
                  onChangeText={setKey}
                  placeholder="sk-ant-…"
                  accessibilityLabel={t('me.ai.keyAccessibilityLabel')}
                />
              </ReplayMask>
              <Button
                label={t('me.ai.saveKey')}
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
  if (Number.isNaN(at)) return t('me.ai.resetsDaily')
  const time = new Intl.DateTimeFormat(currentFormatLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(at))
  return t('me.ai.resetsAt', { time })
}
