import { type Language } from '@thinkering/core'
import { getSetting, listInterests, setSetting } from '@thinkering/db'
import { useEffect, useState } from 'react'

import { db } from '@/db'

import { i18n } from './index'
import { AVAILABLE_LANGUAGES, deviceLanguage } from './language'

/** The Me → Settings → Language choice: a language, or whatever the device uses. */
export type LanguagePreference = Language | 'device'

const LANGUAGE_KEY = 'app_language'

/** A stored language this build no longer has reads as the device default. */
export function getLanguagePreference(): LanguagePreference {
  const stored = getSetting<string>(db, LANGUAGE_KEY)
  const available = AVAILABLE_LANGUAGES.find((l) => l === stored)
  return available ?? 'device'
}

export function resolveLanguage(preference: LanguagePreference): Language {
  return preference === 'device' ? deviceLanguage() : preference
}

export function changeLanguage(preference: LanguagePreference): void {
  setSetting(db, LANGUAGE_KEY, preference)
  void i18n.changeLanguage(resolveLanguage(preference))
}

/**
 * Records a choice the first time a build with the setting opens. An install
 * that already has an interest has been learning in English, so it stays in
 * English rather than switching to the device's language under someone;
 * anyone new follows the device.
 */
function recordFirstPreference(): void {
  if (getSetting(db, LANGUAGE_KEY) !== undefined) return
  setSetting(db, LANGUAGE_KEY, listInterests(db).length > 0 ? 'en' : 'device')
}

/**
 * Applies the stored preference once the database is ready, and reports when
 * it has. Waits for `dbReady` because on a fresh install the settings table
 * doesn't exist until migrations run.
 */
export function useAppLanguage(dbReady: boolean): boolean {
  const [applied, setApplied] = useState(false)
  useEffect(() => {
    if (!dbReady) return
    recordFirstPreference()
    void i18n.changeLanguage(resolveLanguage(getLanguagePreference())).then(() => setApplied(true))
  }, [dbReady])
  return applied
}
