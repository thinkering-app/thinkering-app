import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import type { IntakeDraft } from '@thinkering/core'
import { clearIntakeDraft, getIntakeDraft } from '@thinkering/db'

import { Button } from '@/components/button'
import { Sheet } from '@/components/sheet'
import { db } from '@/db'

/**
 * Every "add an interest" button goes through here. With an unfinished intake
 * waiting, a sheet asks first — keep going with it, or start a new one, which
 * replaces it — so a draft is never lost to a tap on +.
 */
export function useAddInterest() {
  const { t } = useTranslation()
  // Held past closing, so the sheet keeps its text while it slides away.
  const [draft, setDraft] = useState<IntakeDraft | null>(null)
  const [open, setOpen] = useState(false)

  const addInterest = () => {
    const found = getIntakeDraft(db)
    if (!found) {
      router.push('/intake')
      return
    }
    setDraft(found)
    setOpen(true)
  }

  const go = (keep: boolean) => {
    if (!keep) clearIntakeDraft(db)
    setOpen(false)
    router.push('/intake')
  }

  const resumeSheet = (
    <Sheet
      visible={open}
      onClose={() => setOpen(false)}
      title={t('intake.addInterest.resumeTitle')}
      footer={
        <View className="gap-1">
          <Button
            testID="intake-resume"
            label={t('intake.addInterest.keepGoing')}
            onPress={() => go(true)}
          />
          <Button
            testID="intake-start-new"
            label={t('intake.addInterest.startNew')}
            variant="quiet"
            onPress={() => go(false)}
          />
        </View>
      }
    >
      <Text className="font-sans text-body text-ink-soft">{draft?.answers.wantToLearn.trim()}</Text>
    </Sheet>
  )

  return { addInterest, resumeSheet }
}
