import Ionicons from '@expo/vector-icons/Ionicons'
import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  activeLibraryItems,
  isOverLimit,
  type LibraryItem,
  type LocalDate,
  type Section,
} from '@thinkering/core'
import { listGoals, listLibraryPrefs } from '@thinkering/db'

import { librarySituation } from '@/ai/context'
import { Button } from '@/components/button'
import { ChoiceChip } from '@/components/choice-chip'
import { SECTION_LABEL_KEY } from '@/components/section-header'
import { InfoDialog, Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { db } from '@/db'
import { libraryItemCopy } from '@/i18n/library'
import { colors } from '@/theme/tokens'
import { defaultRequestPick, type ActivityRequest } from './plan'

/**
 * A section's + card (docs/01 §3): one more activity, optionally for a goal
 * they choose, of a type they choose (Next and Strengthen), and shaped by what
 * they'd like to focus on. With no goal and no focus, it lands where the
 * section would have gone next.
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
  const { t } = useTranslation()
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [goalId, setGoalId] = useState<string | null>(null)
  const [typesOpen, setTypesOpen] = useState(false)
  const [libraryItemId, setLibraryItemId] = useState<string | null>(null)
  const [info, setInfo] = useState<LibraryItem | null>(null)
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
  // The same set G5a would choose from. Go further's items mostly stand on a
  // saved resource, so its type stays the model's call.
  const types = useMemo(
    () =>
      section === 'go_further'
        ? []
        : activeLibraryItems(
            section,
            listLibraryPrefs(db, interestId),
            librarySituation(listGoals(db, interestId)),
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

  // Collapsing drops the choice, so a hidden goal or type never shapes the request.
  const toggleGoals = () => {
    if (goalsOpen) setGoalId(null)
    setGoalsOpen(!goalsOpen)
  }
  const toggleTypes = () => {
    if (typesOpen) setLibraryItemId(null)
    setTypesOpen(!typesOpen)
  }

  const close = () => {
    setGoalsOpen(false)
    setGoalId(null)
    setTypesOpen(false)
    setLibraryItemId(null)
    setFocus('')
    onClose()
  }

  const infoCopy = info ? libraryItemCopy(info) : null

  const submit = () => {
    onRequest({ section, goalId, libraryItemId, focus })
    close()
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={t('today.request.createTitle', { section: t(SECTION_LABEL_KEY[section]) })}
      footer={
        <Button
          label={t('today.request.create')}
          onPress={submit}
          disabled={!ready}
          testID="request-create"
        />
      }
    >
      {goals.length > 0 ? (
        <Fold label={t('today.request.forGoal')} open={goalsOpen} onToggle={toggleGoals}>
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
        </Fold>
      ) : null}
      {types.length > 1 ? (
        <Fold label={t('today.request.activityType')} open={typesOpen} onToggle={toggleTypes}>
          <View>
            {types.map((item, i) => {
              const selected = item.id === libraryItemId
              const { name } = libraryItemCopy(item)
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setLibraryItemId(selected ? null : item.id)}
                  className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-hairline' : ''}`}
                >
                  <View className="flex-1 flex-row items-center gap-1.5">
                    <Text
                      className={`shrink font-sans-medium text-body ${selected ? 'text-cornflower-deep' : 'text-ink'}`}
                    >
                      {name}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('today.aboutItem', { name })}
                      onPress={() => setInfo(item)}
                      hitSlop={10}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={20}
                        color={colors.ink.soft}
                      />
                    </Pressable>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color={colors.cornflower.deep} />
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        </Fold>
      ) : null}
      <TextField
        value={focus}
        onChangeText={setFocus}
        placeholder={t('today.request.focusPlaceholder')}
        multiline
        testID="request-focus"
        limit="note"
      />
      <InfoDialog
        visible={infoCopy !== null}
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

/** An optional choice, folded away until the learner opens it. */
function Fold({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        className="flex-row items-center gap-2"
      >
        <Text className="flex-1 font-sans-medium text-secondary text-ink-soft">{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.ink.soft} />
      </Pressable>
      {open ? children : null}
    </View>
  )
}
