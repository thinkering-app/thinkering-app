import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import { CONTEXT_KINDS, isOverLimit, type ContextKind } from '@thinkering/core'
import type { Context } from '@thinkering/db'

import { Button } from '@/components/button'
import { ChoiceChip } from '@/components/choice-chip'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'

/**
 * A project, environment or person attached to the interest (docs/01 §5 path
 * settings). Go further activities draw on these when they genuinely add
 * something (docs/04).
 *
 * Like GoalSheet, the fields seed at mount — the parent keys the sheet by the
 * context it is editing.
 */

export const CONTEXT_KIND_LABEL_KEY = {
  project: 'path.contextSheet.kind.project',
  environment: 'path.contextSheet.kind.environment',
  person: 'path.contextSheet.kind.person',
} as const satisfies Record<ContextKind, string>

export interface ContextDraft {
  kind: ContextKind
  label: string
  notes: string
}

type ContextSheetProps = {
  visible: boolean
  onClose: () => void
  context: Context | null
  onSave: (draft: ContextDraft) => void
  onDelete?: () => void
}

export function ContextSheet({ visible, onClose, context, onSave, onDelete }: ContextSheetProps) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<ContextKind>(context?.kind ?? 'project')
  const [label, setLabel] = useState(context?.label ?? '')
  const [notes, setNotes] = useState(context?.notes ?? '')

  const save = () => {
    const trimmed = label.trim()
    if (trimmed.length === 0) return
    onSave({ kind, label: trimmed, notes: notes.trim() })
    onClose()
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={context ? t('path.contextSheet.editTitle') : t('path.contextSheet.addTitle')}
      footer={
        <Button
          label={t('common.save')}
          onPress={save}
          disabled={
            label.trim().length === 0 || isOverLimit(label, 'line') || isOverLimit(notes, 'note')
          }
        />
      }
    >
      <View className="flex-row flex-wrap gap-2">
        {CONTEXT_KINDS.map((option) => (
          <ChoiceChip
            key={option}
            label={t(CONTEXT_KIND_LABEL_KEY[option])}
            selected={kind === option}
            onPress={() => setKind(option)}
          />
        ))}
      </View>
      <TextField
        value={label}
        onChangeText={setLabel}
        placeholder={
          kind === 'person'
            ? t('path.contextSheet.namePlaceholderWho')
            : t('path.contextSheet.namePlaceholderWhat')
        }
        accessibilityLabel={t('path.contextSheet.nameAccessibilityLabel')}
        limit="line"
      />
      <TextField
        value={notes}
        onChangeText={setNotes}
        placeholder={t('path.contextSheet.notesPlaceholder')}
        multiline
        accessibilityLabel={t('path.contextSheet.notesAccessibilityLabel')}
        limit="note"
      />
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onDelete()
            onClose()
          }}
          className="items-center self-center rounded-pill px-5 py-3"
        >
          <Text className="font-sans-medium text-secondary text-ink-soft">
            {t('path.contextSheet.remove')}
          </Text>
        </Pressable>
      ) : null}
    </Sheet>
  )
}
