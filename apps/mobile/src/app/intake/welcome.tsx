import Ionicons from '@expo/vector-icons/Ionicons'
import { LANGUAGE_NAMES } from '@thinkering/core'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ReplayAskCard } from '@/analytics'
import { importFromFile, refusalMessage } from '@/backup/actions'
import { LanguageChoices } from '@/components/language-choices'
import { Sheet } from '@/components/sheet'
import { Wash } from '@/components/texture'
import { AVAILABLE_LANGUAGES, currentLanguage } from '@/i18n'
import { PrimaryAction } from '@/intake/step-screen'
import { backupConfigured } from '@/sync/supabase'
import { colors } from '@/theme/tokens'

/** The brief welcome ahead of the six questions (docs/01 §1). Not a step — no progress dot. */
export default function WelcomeScreen() {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [choosingLanguage, setChoosingLanguage] = useState(false)

  // Coming back has to be reachable on a fresh install, which is the one moment
  // Me isn't (docs/01 §1). With no account to sign in to, it's the file alone.
  const restore = async () => {
    setError(null)
    const outcome = await importFromFile()
    if (outcome.ok) router.replace('/today')
    else if (outcome.reason !== 'cancelled') setError(refusalMessage(outcome.reason))
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right', 'bottom']}>
      {/* Washes bleed off the edges like the landing hero (docs/07) — a field, not a shape. */}
      <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
        {/* Clear of the replay card, which covers the top until it's answered. */}
        <Wash color="cornflower" size={380} className="-left-28 top-1/4" />
        <Wash color="peach" size={340} className="-right-24 top-[8%]" />
        <Wash color="sun" size={340} className="-bottom-24 -left-16" />
      </View>
      {/* The one-time replay ask (docs/08) sits up top, clear of Get started. */}
      <View className="px-5 pt-3">
        <ReplayAskCard />
      </View>
      <View className="flex-1 justify-end px-5 pb-2">
        <Text className="font-sans-medium text-body text-ink-soft">
          {t('intake.welcome.greeting')}
        </Text>
        <Text className="mt-1 font-heading-bold text-display text-ink">thinkering</Text>
        <Text className="mt-3 font-sans text-body text-ink-soft">{t('intake.welcome.body')}</Text>
        {error ? <Text className="mt-6 font-sans text-secondary text-peach">{error}</Text> : null}
        <View className="mt-10">
          <PrimaryAction
            testID="intake-start"
            label={t('intake.welcome.getStarted')}
            onPress={() => router.push('/intake/learn')}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => (backupConfigured ? router.push('/intake/returning') : void restore())}
          className="items-center py-4"
        >
          <Text className="font-sans-medium text-secondary text-ink-soft">
            {backupConfigured
              ? t('intake.welcome.signInOrRestore')
              : t('intake.welcome.restoreFromBackup')}
          </Text>
        </Pressable>
        {/* For a phone set to a language they'd rather not learn in (docs/00 D23). */}
        {AVAILABLE_LANGUAGES.length > 1 ? (
          <Pressable
            testID="welcome-language"
            accessibilityRole="button"
            accessibilityLabel={t('intake.welcome.languageAccessibilityLabel', {
              language: LANGUAGE_NAMES[currentLanguage()],
            })}
            onPress={() => setChoosingLanguage(true)}
            className="flex-row items-center justify-center gap-1.5 pb-2"
          >
            <Ionicons name="globe-outline" size={16} color={colors.ink.soft} />
            <Text className="font-sans text-secondary text-ink-soft">
              {LANGUAGE_NAMES[currentLanguage()]}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Sheet
        visible={choosingLanguage}
        onClose={() => setChoosingLanguage(false)}
        title={t('me.language.title')}
      >
        <LanguageChoices />
      </Sheet>
    </SafeAreaView>
  )
}
