import Ionicons from '@expo/vector-icons/Ionicons'
import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  activeLibraryItems,
  isOverLimit,
  resourceChoices,
  type LibraryItem,
  type LocalDate,
  type Section,
} from '@thinkering/core'
import { getInterest, listGoals, listLibraryPrefs, listResources } from '@thinkering/db'

import { librarySituation } from '@/ai/context'
import { Button } from '@/components/button'
import { ChoiceChip } from '@/components/choice-chip'
import { SECTION_LABEL_KEY } from '@/components/section-header'
import { InfoDialog, Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { db } from '@/db'
import { libraryItemCopy } from '@/i18n/library'
import { AddLinkSheet } from '@/resources/add-link-sheet'
import { hostOf } from '@/resources/link'
import { colors } from '@/theme/tokens'
import { defaultRequestPick, type ActivityRequest } from './plan'

/**
 * A section's + card (docs/01 §3): one more activity, optionally for a goal
 * they choose, of a type they choose (Next and Strengthen; a section down to
 * one type shows it, already chosen), and shaped by what they'd like to focus
 * on. A type built around a saved resource needs one chosen, or added here.
 * With no goal and no focus, it lands where the section would have gone next.
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
  const [resourceId, setResourceId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [resourcesVersion, setResourcesVersion] = useState(0)
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
  // The only type there is is the one they'll get.
  const single = types.length === 1
  const type = single ? types[0] : types.find((item) => item.id === libraryItemId)
  const needsResource = type?.usesResources === true
  const resources = useMemo(
    () =>
      type && needsResource ? resourceChoices(type, goalId, listResources(db, interestId)) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `resourcesVersion` is the re-read trigger
    [interestId, type, needsResource, goalId, resourcesVersion],
  )
  const interest = useMemo(
    () => getInterest(db, interestId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interestId, visible],
  )
  // When every type needs a resource, one has to be chosen to choose it.
  const ready =
    (goalId !== null || focus.trim().length > 0 || hasDefault) &&
    (type !== undefined || types.length === 0 || types.some((item) => !item.usesResources)) &&
    (!needsResource || resourceId !== null) &&
    !isOverLimit(focus, 'note')

  // Collapsing drops the choice, so a hidden goal or type never shapes the request.
  const toggleGoals = () => {
    if (goalsOpen) setGoalId(null)
    setGoalsOpen(!goalsOpen)
  }
  const toggleTypes = () => {
    if (typesOpen) chooseType(null)
    setTypesOpen(!typesOpen)
  }
  // A resource belongs to the type it was chosen for.
  const chooseType = (id: string | null) => {
    setLibraryItemId(id)
    setResourceId(null)
  }

  const close = () => {
    setGoalsOpen(false)
    setGoalId(null)
    setTypesOpen(false)
    chooseType(null)
    setFocus('')
    onClose()
  }

  const infoCopy = info ? libraryItemCopy(info) : null

  const submit = () => {
    onRequest({
      section,
      goalId,
      libraryItemId: type?.id ?? null,
      resourceId: needsResource ? resourceId : null,
      focus,
    })
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
      {single ? (
        <View className="gap-2">
          <Text className="font-sans-medium text-secondary text-ink-soft">Activity type</Text>
          <TypeRow item={types[0]!} selected onInfo={setInfo} />
        </View>
      ) : types.length > 1 ? (
        <Fold label={t('today.request.activityType')} open={typesOpen} onToggle={toggleTypes}>
          <View>
            {types.map((item, i) => {
              const selected = item.id === libraryItemId
              return (
                <TypeRow
                  key={item.id}
                  item={item}
                  selected={selected}
                  divided={i > 0}
                  onPress={() => chooseType(selected ? null : item.id)}
                  onInfo={setInfo}
                />
              )
            })}
          </View>
        </Fold>
      ) : null}
      {type && needsResource ? (
        <View className="gap-2">
          <Text className="font-sans-medium text-secondary text-ink-soft">
            {type.resourceMedia === 'video' ? 'Video' : 'Reading'}
          </Text>
          <View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAdding(true)}
              className="flex-row items-center gap-3 py-3"
              testID="request-add-resource"
            >
              <Ionicons name="add" size={20} color={colors.cornflower.deep} />
              <Text className="flex-1 font-sans-medium text-body text-cornflower-deep">
                {type.resourceMedia === 'video' ? 'Add a video' : 'Add a reading'}
              </Text>
            </Pressable>
            {resources.map((resource) => {
              const selected = resource.id === resourceId
              return (
                <Pressable
                  key={resource.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setResourceId(selected ? null : resource.id)}
                  className="flex-row items-center gap-3 border-t border-hairline py-3"
                >
                  <View className="flex-1">
                    <Text
                      className={`font-sans-medium text-body ${selected ? 'text-cornflower-deep' : 'text-ink'}`}
                      numberOfLines={2}
                    >
                      {resource.title}
                    </Text>
                    <Text className="font-sans text-caption text-ink-soft">
                      {hostOf(resource.url)}
                    </Text>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color={colors.cornflower.deep} />
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}
      <TextField
        value={focus}
        onChangeText={setFocus}
        placeholder={t('today.request.focusPlaceholder')}
        multiline
        testID="request-focus"
        limit="note"
      />
      {interest ? (
        <AddLinkSheet
          key={adding ? 'open' : 'closed'}
          visible={adding}
          onClose={() => setAdding(false)}
          interest={interest}
          media={type?.resourceMedia}
          onSaved={(resource) => {
            setResourcesVersion((n) => n + 1)
            setResourceId(resource.id)
          }}
        />
      ) : null}
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

/** One activity type, with an ⓘ for what it is. */
function TypeRow({
  item,
  selected,
  divided = false,
  onPress,
  onInfo,
}: {
  item: LibraryItem
  selected: boolean
  divided?: boolean
  /** Absent for a type that can't be unchosen. */
  onPress?: () => void
  onInfo: (item: LibraryItem) => void
}) {
  const { t } = useTranslation()
  const { name } = libraryItemCopy(item)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center gap-3 py-3 ${divided ? 'border-t border-hairline' : ''}`}
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
          onPress={() => onInfo(item)}
          hitSlop={10}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.ink.soft} />
        </Pressable>
      </View>
      {selected ? <Ionicons name="checkmark" size={20} color={colors.cornflower.deep} /> : null}
    </Pressable>
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
