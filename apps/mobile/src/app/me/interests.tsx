import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useMemo, useReducer, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { INTEREST_STATUSES, type InterestStatus } from '@thinkering/core'
import { listInterests, reorderInterests, updateInterest, type Interest } from '@thinkering/db'

import { Pill } from '@/components/pill'
import { SubScreen } from '@/components/sub-screen'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'
import { colors } from '@/theme/tokens'

/**
 * Manage Interests (docs/01 §7): the order the selector shows them in, and
 * whether each one is in focus, exploring, or archived. Archived interests keep
 * everything they have — they just stop appearing anywhere else.
 */

const STATUS_LABEL: Record<InterestStatus, string> = {
  focus: 'In focus',
  exploring: 'Exploring',
  archived: 'Archived',
}

export default function ManageInterestsScreen() {
  const [version, reload] = useReducer((n: number) => n + 1, 0)
  const [reordering, setReordering] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
  const interests = useMemo(() => listInterests(db), [version])
  const active = interests.filter((i) => i.status !== 'archived')
  const archived = interests.filter((i) => i.status === 'archived')

  const move = (index: number, to: number) => {
    const order = active.map((i) => i.id)
    const [moved] = order.splice(index, 1)
    order.splice(to, 0, moved!)
    reorderInterests(db, repoContext, order)
    track('settings_changed', { key: 'interest_order' })
    reload()
  }

  const setStatus = (interest: Interest, status: InterestStatus) => {
    updateInterest(db, repoContext, interest.id, { status })
    track('settings_changed', { key: 'interest_status' })
    reload()
  }

  return (
    <SubScreen
      title="Interests"
      action={
        reordering ? (
          <Pressable accessibilityRole="button" onPress={() => setReordering(false)} hitSlop={10}>
            <Text className="font-sans-medium text-body text-cornflower-deep">Done</Text>
          </Pressable>
        ) : (
          // Existing users skip the welcome screen (docs/01 §1), same as the
          // selector's + on Today.
          <Pressable
            testID="me-add-interest"
            accessibilityRole="button"
            accessibilityLabel="Add an interest"
            onPress={() => router.push('/intake/learn')}
            hitSlop={10}
          >
            <Ionicons name="add" size={24} color={colors.ink.DEFAULT} />
          </Pressable>
        )
      }
    >
      <View className="gap-3">
        {active.map((interest, index) => (
          <InterestRow
            key={interest.id}
            interest={interest}
            onStatus={(status) => setStatus(interest, status)}
            onLongPress={() => setReordering(true)}
            onMoveUp={reordering && index > 0 ? () => move(index, index - 1) : undefined}
            onMoveDown={
              reordering && index < active.length - 1 ? () => move(index, index + 1) : undefined
            }
          />
        ))}
      </View>

      {archived.length > 0 ? (
        <View className="gap-3">
          <Text className="font-heading-bold text-heading text-ink">Archived</Text>
          {archived.map((interest) => (
            <InterestRow
              key={interest.id}
              interest={interest}
              onStatus={(status) => setStatus(interest, status)}
            />
          ))}
        </View>
      ) : null}

      {interests.length === 0 ? (
        <Text className="px-3 py-10 text-center font-sans text-body text-ink-soft">
          Interests you add show up here.
        </Text>
      ) : null}
    </SubScreen>
  )
}

function InterestRow({
  interest,
  onStatus,
  onLongPress,
  onMoveUp,
  onMoveDown,
}: {
  interest: Interest
  onStatus: (status: InterestStatus) => void
  onLongPress?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const reordering = onMoveUp !== undefined || onMoveDown !== undefined
  return (
    <Pressable
      onLongPress={onLongPress}
      className={`gap-3 rounded-card border border-hairline bg-surface p-4 ${
        interest.status === 'archived' ? 'opacity-60' : ''
      }`}
    >
      <View className="flex-row items-center gap-3">
        <Text className="flex-1 font-heading text-body text-ink">{interest.name}</Text>
        {reordering ? (
          <View className="flex-row gap-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Move ${interest.name} up`}
              disabled={!onMoveUp}
              onPress={onMoveUp}
              hitSlop={8}
            >
              <Ionicons
                name="chevron-up"
                size={20}
                color={onMoveUp ? colors.cornflower.deep : colors.hairline}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Move ${interest.name} down`}
              disabled={!onMoveDown}
              onPress={onMoveDown}
              hitSlop={8}
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={onMoveDown ? colors.cornflower.deep : colors.hairline}
              />
            </Pressable>
          </View>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {INTEREST_STATUSES.map((status) => (
          <Pill
            key={status}
            label={STATUS_LABEL[status]}
            selected={interest.status === status}
            onPress={() => onStatus(status)}
          />
        ))}
      </View>
    </Pressable>
  )
}
