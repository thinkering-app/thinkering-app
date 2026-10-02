import Ionicons from '@expo/vector-icons/Ionicons'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { libraryPrefsForSection, type LibraryItem, type Section } from '@thinkering/core'
import { listGoals, listLibraryPrefs, setLibraryPref } from '@thinkering/db'

import { InfoDialog, Sheet } from '@/components/sheet'
import { librarySituation } from '@/ai/context'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'
import { SECTION_LABEL_KEY } from '@/components/section-header'
import { Toggle } from '@/components/toggle'
import { libraryItemCopy } from '@/i18n/library'
import { colors } from '@/theme/tokens'

/** Under the sheet title: what the section is for, then what the list is. Translation keys, not the copy. */
const SECTION_HELP_KEY = {
  next: 'today.configureSheet.help.next',
  strengthen: 'today.configureSheet.help.strengthen',
  go_further: 'today.configureSheet.help.goFurther',
} as const satisfies Record<Section, string>

/**
 * The per-section ⚙ sheet (docs/01 §3): which strategies this interest draws
 * from, as a list. The ⓘ explains a strategy; the switch turns it on or off.
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
  const { t } = useTranslation()
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
    if (dirty) {
      track('routine_configured', { via: 'checkboxes' })
      onChanged(section)
    }
    setDirty(false)
    onClose()
  }

  const infoCopy = info ? libraryItemCopy(info) : null

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={t('today.configureSheet.title', { section: t(SECTION_LABEL_KEY[section]) })}
    >
      <Text className="font-sans text-secondary text-ink-soft">
        {t(SECTION_HELP_KEY[section])} {t('today.configureSheet.listHelp')}
      </Text>
      <View>
        {rows.map(({ item, active }, i) => {
          const { name } = libraryItemCopy(item)
          return (
            <View
              key={item.id}
              className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-hairline' : ''}`}
            >
              <View className="flex-1 flex-row items-center gap-1.5">
                <Text className="shrink font-sans-medium text-body text-ink">{name}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('today.aboutItem', { name })}
                  onPress={() => setInfo(item)}
                  hitSlop={10}
                >
                  <Ionicons name="information-circle-outline" size={20} color={colors.ink.soft} />
                </Pressable>
              </View>
              <Toggle
                accessibilityLabel={name}
                value={active}
                disabled={active && activeCount <= 1}
                onValueChange={(next) => toggle(item, next)}
              />
            </View>
          )
        })}
      </View>
      <InfoDialog
        visible={info !== null}
        onClose={() => setInfo(null)}
        title={infoCopy?.name ?? ''}
        body={
          infoCopy
            ? [infoCopy.overview, infoCopy.whyItHelps, infoCopy.activation]
                .filter(Boolean)
                .join('\n\n')
            : ''
        }
      />
    </Sheet>
  )
}
