import { Arvo_400Regular, Arvo_700Bold } from '@expo-google-fonts/arvo'
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit'
import { useFonts } from 'expo-font'
import { Stack, type ErrorBoundaryProps } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import '../global.css'
import '@/i18n'
import { useDbMigrations, type DbUnavailableReason } from '../db'
import { forgetWebByokKey } from '@/ai/secure-store'
import { useAppOpened, useSessionReplay } from '@/analytics'
import { AppFrame } from '@/components/app-frame'
import { Button } from '@/components/button'
import { useAppLanguage } from '@/i18n/preference'
import { PaperGrain } from '@/components/texture'
import { useDevLink } from '@/dev/dev-link'
import { useSyncLifecycle } from '@/sync/schedule'

SplashScreen.preventAutoHideAsync()

const DB_UNAVAILABLE_KEY = {
  'another-tab': 'common.dbUnavailable.anotherTab',
  'no-storage': 'common.dbUnavailable.noStorage',
  unknown: 'common.dbUnavailable.unknown',
} as const satisfies Record<DbUnavailableReason, string>

/**
 * The last stop for anything a screen throws. Without it a single failed render
 * — a query that times out on a browser that won't service the SQLite worker,
 * say — unmounts the tree and leaves a white page with nothing to act on.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { t } = useTranslation()
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-paper px-8">
      <Text className="text-center font-sans text-body text-ink">{t('common.screenError')}</Text>
      <Button label={t('common.tryAgain')} onPress={() => void retry()} />
    </View>
  )
}

export default function RootLayout() {
  const { t } = useTranslation()
  const [fontsLoaded] = useFonts({
    Arvo_400Regular,
    Arvo_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  })
  const migrations = useDbMigrations()
  const languageApplied = useAppLanguage(migrations.success)
  const ready = fontsLoaded && (languageApplied || Boolean(migrations.failure))
  // These wait for the schema: their effects run before the first render that
  // does, and on a fresh install the tables they read don't exist yet.
  useSyncLifecycle(migrations.success)
  // Before `useAppOpened`: a `?dev` link turns analytics off ahead of the first event.
  useDevLink(migrations.success)
  useAppOpened(migrations.success)
  useSessionReplay(migrations.success)

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  useEffect(forgetWebByokKey, [])

  if (!ready) return null

  if (migrations.failure) {
    // The database couldn't be opened, so local data can't be trusted — stop
    // rather than run on a wrong schema. The web-only causes get actionable
    // copy and an explicit retry that replaces expo-sqlite's failed worker.
    return (
      <View className="flex-1 items-center justify-center gap-6 bg-paper px-8">
        <Text className="text-center font-sans text-body text-ink">
          {t(DB_UNAVAILABLE_KEY[migrations.failure])}
        </Text>
        <Button label={t('common.tryAgain')} onPress={migrations.retry} />
      </View>
    )
  }

  return (
    <View className="flex-1">
      <StatusBar style="dark" />
      <AppFrame>
        <Stack screenOptions={{ headerShown: false }} />
      </AppFrame>
      {/* The paper grain sits over every screen and under every sheet (docs/07). */}
      <PaperGrain />
    </View>
  )
}
