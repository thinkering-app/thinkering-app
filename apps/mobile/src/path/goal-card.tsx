import Ionicons from '@expo/vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import type { GoalConcept, GoalStatus } from '@thinkering/core'

import { colors } from '@/theme/tokens'
import type { PathGoalView } from './use-path'

/**
 * One goal in the path (docs/01 §5, docs/07): status is a colour treatment, not
 * a pill. Tapping expands it to the concepts and skills beneath it with their
 * coverage (D16); long-pressing turns on reorder mode.
 */

const STATUS_LABEL_KEY = {
  not_started: 'path.goalStatus.notStarted',
  introduced: 'path.goalStatus.introduced',
  strengthened: 'path.goalStatus.strengthened',
  applied: 'path.goalStatus.applied',
} as const satisfies Record<GoalStatus, string>

interface Treatment {
  card: string
  title: string
  body: string
  /** Concept chip on this card's background. */
  chip: string
  chipText: string
  icon: string
}

const TREATMENT: Record<GoalStatus, Treatment> = {
  not_started: {
    card: 'bg-surface border border-hairline',
    title: 'text-ink',
    body: 'text-ink-soft',
    chip: 'bg-paper border border-hairline',
    chipText: 'text-ink-soft',
    icon: colors.ink.soft,
  },
  introduced: {
    card: 'bg-cornflower-tint border border-cornflower-tint',
    title: 'text-ink',
    body: 'text-ink-soft',
    chip: 'bg-surface border border-hairline',
    chipText: 'text-ink-soft',
    icon: colors.cornflower.deep,
  },
  strengthened: {
    card: 'bg-cornflower-deep border border-cornflower-deep',
    title: 'text-white',
    body: 'text-cornflower-tint',
    chip: 'bg-cornflower border border-cornflower',
    chipText: 'text-white',
    icon: colors.cornflower.tint,
  },
  // Put to use keeps the strengthened fill and adds the peach edge — the
  // celebratory delighter, since going further is optional (docs/07).
  applied: {
    card: 'bg-cornflower-deep border-2 border-peach',
    title: 'text-white',
    body: 'text-cornflower-tint',
    chip: 'bg-cornflower border border-cornflower',
    chipText: 'text-white',
    icon: colors.peach.DEFAULT,
  },
}

type GoalCardProps = {
  view: PathGoalView
  expanded: boolean
  onToggle: () => void
  /** Absent where the path is shown read-only (the reflection flow). */
  onEdit?: () => void
  onLongPress?: () => void
  /** Present in reorder mode; absent at an end of the path. */
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function GoalCard({
  view,
  expanded,
  onToggle,
  onEdit,
  onLongPress,
  onMoveUp,
  onMoveDown,
}: GoalCardProps) {
  const { t } = useTranslation()
  const { goal, covered } = view
  const tone = TREATMENT[goal.status]
  const reordering = Boolean(onMoveUp || onMoveDown)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('path.goalCard.accessibilityLabel', {
        title: goal.title,
        status: t(STATUS_LABEL_KEY[goal.status]),
      })}
      accessibilityState={{ expanded }}
      onPress={reordering ? undefined : onToggle}
      onLongPress={onLongPress}
      className={`gap-2 rounded-card p-4 shadow-card ${tone.card}`}
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-1">
          <Text className={`font-heading text-body ${tone.title}`}>{goal.title}</Text>
          {goal.status === 'not_started' ? null : (
            <Text className={`font-sans text-caption ${tone.body}`}>
              {t(STATUS_LABEL_KEY[goal.status])}
            </Text>
          )}
        </View>
        {reordering ? (
          <View className="flex-row gap-1">
            <IconButton
              name="chevron-up"
              label={t('path.goalCard.moveUpAccessibilityLabel', { title: goal.title })}
              color={tone.icon}
              onPress={onMoveUp}
            />
            <IconButton
              name="chevron-down"
              label={t('path.goalCard.moveDownAccessibilityLabel', { title: goal.title })}
              color={tone.icon}
              onPress={onMoveDown}
            />
          </View>
        ) : onEdit ? (
          <IconButton
            name="create-outline"
            label={t('path.goalCard.editAccessibilityLabel', { title: goal.title })}
            color={tone.icon}
            onPress={onEdit}
          />
        ) : null}
      </View>

      {expanded && !reordering ? (
        <View className="gap-3 pt-1">
          <Text className={`font-sans text-secondary ${tone.body}`}>{goal.description}</Text>
          <View className="flex-row flex-wrap gap-2">
            {goal.concepts.map((concept: GoalConcept) => (
              <ConceptChip
                key={concept.id}
                concept={concept}
                covered={covered.has(concept.id)}
                tone={tone}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Pressable>
  )
}

function ConceptChip({
  concept,
  covered,
  tone,
}: {
  concept: GoalConcept
  covered: boolean
  tone: Treatment
}) {
  const { t } = useTranslation()
  return (
    <View
      accessibilityLabel={
        covered
          ? t('path.goalCard.conceptCoveredAccessibilityLabel', { label: concept.label })
          : concept.label
      }
      className={`flex-row items-center gap-1.5 rounded-pill px-3 py-1.5 ${tone.chip} ${covered ? '' : 'opacity-70'}`}
    >
      {covered ? <Ionicons name="checkmark" size={12} color={tone.icon} /> : null}
      <Text className={`font-sans text-caption ${tone.chipText}`}>{concept.label}</Text>
    </View>
  )
}

function IconButton({
  name,
  label,
  color,
  onPress,
}: {
  name: React.ComponentProps<typeof Ionicons>['name']
  label: string
  color: string
  onPress?: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={10}
      className={onPress ? '' : 'opacity-30'}
    >
      <Ionicons name={name} size={20} color={color} />
    </Pressable>
  )
}
