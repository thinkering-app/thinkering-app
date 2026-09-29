import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { isOverLimit, type LocalDate, type Section } from '@thinkering/core'
import { listGoals } from '@thinkering/db'

import { Button } from '@/components/button'
import { ChoiceChip } from '@/components/choice-chip'
import { SECTION_LABELS } from '@/components/section-header'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { db } from '@/db'
import { defaultRequestPick, type ActivityRequest } from './plan'

/**
 * A section's + card (docs/01 §3): one more activity, optionally for a goal
 * they choose and shaped by what they'd like to focus on. With neither, it
 * lands where the section would have gone next.
 */
export function RequestSheet({
  visible,
  onClose,
  interestId,
  section,
  today,
  onRequest,
}: {
  visible: boolean
  onClose: () => void
  interestId: string
  section: Section
  today: LocalDate
  onRequest: (request: ActivityRequest) => void
}) {
  const [goalId, setGoalId] = useState<string | null>(null)
  const [focus, setFocus] = useState('')

  // Re-read on open; still there while the sheet slides away. Next introduces,
  // so it only offers goals that haven't been started.
  const goals = useMemo(
    () =>
      listGoals(db, interestId).filter(
        (goal) => section !== 'next' || goal.status === 'not_started',
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interestId, section, visible],
  )
  const hasDefault = useMemo(
    () => defaultRequestPick(interestId, today, section) !== null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interestId, section, today, visible],
  )
  const ready =
    (goalId !== null || focus.trim().length > 0 || hasDefault) && !isOverLimit(focus, 'note')

  const close = () => {
    setGoalId(null)
    setFocus('')
    onClose()
  }

  const submit = () => {
    onRequest({ section, goalId, focus })
    close()
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={`Create a new ${SECTION_LABELS[section]} activity`}
      footer={<Button label="Create" onPress={submit} disabled={!ready} testID="request-create" />}
    >
      {goals.length > 0 ? (
        <View className="gap-2">
          <Text className="font-sans text-secondary text-ink-soft">For a goal</Text>
          <View className="flex-row flex-wrap gap-2">
            {goals.map((goal) => (
              <ChoiceChip
                key={goal.id}
                label={goal.title}
                selected={goal.id === goalId}
                onPress={() => setGoalId(goal.id === goalId ? null : goal.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
      <TextField
        value={focus}
        onChangeText={setFocus}
        placeholder="Anything to focus on, or how you'd like to learn it"
        multiline
        testID="request-focus"
        limit="note"
      />
    </Sheet>
  )
}
