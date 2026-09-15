import Ionicons from '@expo/vector-icons/Ionicons'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { libraryPrefsForSection, type LibraryItem, type Section } from '@thinkering/core'
import { listGoals, listLibraryPrefs, setLibraryPref } from '@thinkering/db'

import { InfoDialog, Sheet } from '@/components/sheet'
import { librarySituation } from '@/ai/context'
import { db, repoContext } from '@/db'
import { SECTION_LABELS } from '@/components/section-header'
import { colors } from '@/theme/tokens'

/**
 * The per-section ⚙ sheet (docs/01 §3): which strategies this interest draws
 * from. Tapping a card explains the strategy; the checkbox turns it on or off.
 * At least one item stays active per section.
 */
export function ConfigureSheet({
  visible,
  onClose,
  interestId,
  section,
  onChanged,
}: {
  visible: boolean
  onClose: () => void
  interestId: string
  section: Section
  /** Called on close when something was toggled, so today's cards can re-plan. */
  onChanged: (section: Section) => void
}) {
  const [version, setVersion] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [info, setInfo] = useState<LibraryItem | null>(null)

  const rows = useMemo(() => {
    const goals = listGoals(db, interestId)
    return libraryPrefsForSection(
      section,
      listLibraryPrefs(db, interestId),
      librarySituation(goals),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestId, section, version, visible])

  const activeCount = rows.filter((r) => r.active).length

  const toggle = (item: LibraryItem, active: boolean) => {
    if (!active && activeCount <= 1) return
    setLibraryPref(db, repoContext, { interestId, section, libraryItemId: item.id, active })
    setVersion((v) => v + 1)
    setDirty(true)
  }

  const close = () => {
    if (dirty) onChanged(section)
    setDirty(false)
    onClose()
  }

  return (
    <Sheet visible={visible} onClose={close} title={SECTION_LABELS[section]}>
      {rows.map(({ item, active }) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`About ${item.name}`}
          onPress={() => setInfo(item)}
          className="flex-row items-center gap-3 rounded-card bg-surface p-4 shadow-card active:bg-cornflower-tint"
        >
          <View className="flex-1 gap-1">
            <Text className="font-heading text-body text-ink">{item.name}</Text>
            <Text className="font-sans text-caption text-ink-soft" numberOfLines={1}>
              {item.overview}
            </Text>
          </View>
          <Checkbox
            label={item.name}
            checked={active}
            disabled={active && activeCount <= 1}
            onPress={() => toggle(item, !active)}
          />
        </Pressable>
      ))}
      <InfoDialog
        visible={info !== null}
        onClose={() => setInfo(null)}
        title={info?.name ?? ''}
        body={info ? `${info.overview}\n\n${info.pedagogy}` : ''}
      />
    </Sheet>
  )
}

function Checkbox({
  label,
  checked,
  disabled,
  onPress,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={10}
      className={`h-7 w-7 items-center justify-center rounded-lg border ${
        checked ? 'border-cornflower-deep bg-cornflower' : 'border-hairline bg-surface'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {checked ? <Ionicons name="checkmark" size={16} color={colors.surface} /> : null}
    </Pressable>
  )
}
