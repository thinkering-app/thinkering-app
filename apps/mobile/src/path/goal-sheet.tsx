import { isOverLimit } from '@thinkering/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, Text, View } from 'react-native'
import type { Goal } from '@thinkering/db'

import { Button } from '@/components/button'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'

/**
 * View and edit one goal (docs/01 §5), or write a new one when `goal` is null.
 * Concepts are generated with the goal and shown on the card, not edited here —
 * the two fields a learner actually wants to change are the title and what it
 * covers.
 *
 * The fields seed from `goal` at mount, so the parent keys the sheet by goal id
 * — a remount is how a different goal's values get in.
 */

export interface GoalDraft {
  title: string
  description: string
}

type GoalSheetProps = {
  visible: boolean
  onClose: () => void
  goal: Goal | null
  onSave: (draft: GoalDraft) => void
  onDelete?: () => void
}

export function GoalSheet({ visible, onClose, goal, onSave, onDelete }: GoalSheetProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')

  const save = () => {
    const trimmed = title.trim()
    if (trimmed.length === 0) return
    onSave({ title: trimmed, description: description.trim() })
    onClose()
  }

  const confirmDelete = () => {
    if (!onDelete) return
    Alert.alert(t('path.goalSheet.confirmDeleteTitle'), goal?.title, [
      { text: t('path.goalSheet.keep'), style: 'cancel' },
      {
        text: t('path.goalSheet.remove'),
        style: 'destructive',
        onPress: () => {
          onDelete()
          onClose()
        },
      },
    ])
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={goal ? t('path.goalSheet.editTitle') : t('path.goalSheet.addTitle')}
      footer={
        <Button
          label={t('common.save')}
          onPress={save}
          disabled={
            title.trim().length === 0 ||
            isOverLimit(title, 'line') ||
            isOverLimit(description, 'note')
          }
        />
      }
    >
      <TextField
        value={title}
        onChangeText={setTitle}
        placeholder={t('path.goalSheet.titlePlaceholder')}
        accessibilityLabel={t('path.goalSheet.titleAccessibilityLabel')}
        limit="line"
      />
      <TextField
        value={description}
        onChangeText={setDescription}
        placeholder={t('path.goalSheet.descriptionPlaceholder')}
        multiline
        accessibilityLabel={t('path.goalSheet.descriptionAccessibilityLabel')}
        limit="note"
      />
      {goal && goal.concepts.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 pt-1">
          {goal.concepts.map((concept) => (
            <View
              key={concept.id}
              className="rounded-pill border border-hairline bg-surface px-3 py-1.5"
            >
              <Text className="font-sans text-caption text-ink-soft">{concept.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          onPress={confirmDelete}
          className="items-center self-center rounded-pill px-5 py-3"
        >
          <Text className="font-sans-medium text-secondary text-ink-soft">
            {t('path.goalSheet.removeGoal')}
          </Text>
        </Pressable>
      ) : null}
    </Sheet>
  )
}
