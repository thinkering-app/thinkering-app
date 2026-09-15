import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { localDateOf, type LocalDate } from '@thinkering/core'

/** Device-local day boundaries (D12), shared by Today, History and the calendar. */

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Today's local date, re-read whenever the screen comes back into focus — an
 * app left open overnight should not keep calling yesterday "Today".
 */
export function useLocalToday(): LocalDate {
  const [today, setToday] = useState<LocalDate>(() => localDateOf(Date.now(), deviceTimeZone()))
  useFocusEffect(
    useCallback(() => setToday(localDateOf(Date.now(), deviceTimeZone())), []),
  )
  return today
}
