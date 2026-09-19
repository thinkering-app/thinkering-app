import { router } from 'expo-router'
import { useState } from 'react'
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
      title="Pick up where you left off?"
      footer={
        <View className="gap-1">
          <Button testID="intake-resume" label="Keep going" onPress={() => go(true)} />
          <Button
            testID="intake-start-new"
            label="Start something new"
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
