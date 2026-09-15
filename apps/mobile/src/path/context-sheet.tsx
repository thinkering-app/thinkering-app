import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CONTEXT_KINDS, type ContextKind } from '@thinkering/core'
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

export const CONTEXT_KIND_LABEL: Record<ContextKind, string> = {
  project: 'Project',
  environment: 'Environment',
  person: 'Person',
}

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
      title={context ? 'Edit context' : 'Add a context'}
      footer={<Button label="Save" onPress={save} disabled={label.trim().length === 0} />}
    >
      <View className="flex-row flex-wrap gap-2">
        {CONTEXT_KINDS.map((option) => (
          <ChoiceChip
            key={option}
            label={CONTEXT_KIND_LABEL[option]}
            selected={kind === option}
            onPress={() => setKind(option)}
          />
        ))}
      </View>
      <TextField
        value={label}
        onChangeText={setLabel}
        placeholder={kind === 'person' ? 'Who' : 'What'}
        accessibilityLabel="Context name"
      />
      <TextField
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything worth knowing about it"
        multiline
        accessibilityLabel="Context notes"
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
          <Text className="font-sans-medium text-secondary text-ink-soft">Remove</Text>
        </Pressable>
      ) : null}
    </Sheet>
  )
}
