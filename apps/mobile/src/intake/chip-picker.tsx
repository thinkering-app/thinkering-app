import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'

import { ChoiceChip } from '@/components/choice-chip'
import { colors } from '@/theme/tokens'

export interface ChipPick {
  /** What the learner wrote themselves, in the order they added it. */
  custom: string[]
  selected: string[]
}

type ChipPickerProps = ChipPick & {
  /** The generated chips; empty while they're still on the way. */
  generated: string[]
  onChange: (next: ChipPick) => void
  addLabel: string
  testID?: string
}

/**
 * Multi-select chips with a small "add your own" field above them (intake
 * steps 4 and 5). What they add is selected straight away and sits first.
 */
export function ChipPicker({
  generated,
  custom,
  selected,
  onChange,
  addLabel,
  testID,
}: ChipPickerProps) {
  const [draft, setDraft] = useState('')
  const labels = [...custom, ...generated.filter((label) => !custom.includes(label))]

  const add = () => {
    const label = draft.trim()
    if (!label) return
    setDraft('')
    const existing = labels.find((l) => l.toLowerCase() === label.toLowerCase())
    if (existing) {
      if (!selected.includes(existing)) onChange({ custom, selected: [...selected, existing] })
      return
    }
    onChange({ custom: [...custom, label], selected: [...selected, label] })
  }

  const toggle = (label: string) =>
    onChange({
      custom,
      selected: selected.includes(label)
        ? selected.filter((l) => l !== label)
        : [...selected, label],
    })

  return (
    <View className="gap-4">
      <View className="flex-row items-center rounded-pill border border-hairline bg-surface pl-4 pr-1.5">
        <TextInput
          testID={testID ? `${testID}-add` : undefined}
          accessibilityLabel={addLabel}
          value={draft}
          onChangeText={setDraft}
          placeholder={addLabel}
          placeholderTextColor={colors.ink.soft}
          selectionColor={colors.cornflower.DEFAULT}
          submitBehavior="submit"
          returnKeyType="done"
          onSubmitEditing={add}
          maxLength={60}
          className="flex-1 py-2.5 font-sans text-body text-ink"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add"
          accessibilityState={{ disabled: !draft.trim() }}
          disabled={!draft.trim()}
          onPress={add}
          hitSlop={8}
          className={`h-8 w-8 items-center justify-center rounded-pill bg-cornflower active:bg-cornflower-deep ${
            draft.trim() ? '' : 'opacity-40'
          }`}
        >
          <Ionicons name="add" size={20} color={colors.surface} />
        </Pressable>
      </View>

      {labels.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {labels.map((label) => (
            <ChoiceChip
              key={label}
              label={label}
              selected={selected.includes(label)}
              onPress={() => toggle(label)}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** The picks that are still on screen — a regenerated list can drop earlier chips. */
export function currentPicks({ custom, selected }: ChipPick, generated: string[]): string[] {
  return selected.filter((label) => custom.includes(label) || generated.includes(label))
}
