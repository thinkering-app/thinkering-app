import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useReducer, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import { INTEREST_STATUSES, type IntakeDraft, type InterestStatus } from '@thinkering/core'
import {
  clearIntakeDraft,
  getIntakeDraft,
  listInterests,
  reorderInterests,
  updateInterest,
  type Interest,
} from '@thinkering/db'

import { confirmDestructive } from '@/components/confirm'
import { Pill } from '@/components/pill'
import { SubScreen } from '@/components/sub-screen'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'
import { useAddInterest } from '@/intake/add-interest'
import { colors } from '@/theme/tokens'

/**
 * Manage Interests (docs/01 §7): the order the selector shows them in, and
 * whether each one is in focus, exploring, or archived. Archived interests keep
 * everything they have — they just stop appearing anywhere else. An intake
 * that hasn't finished sits above them, to pick up or let go.
 */

export default function ManageInterestsScreen() {
  const { t } = useTranslation()
  const STATUS_LABEL: Record<InterestStatus, string> = {
    focus: t('me.interests.statusFocus'),
    exploring: t('me.interests.statusExploring'),
    archived: t('me.interests.statusArchived'),
  }
  const [version, reload] = useReducer((n: number) => n + 1, 0)
  const [reordering, setReordering] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
  const interests = useMemo(() => listInterests(db), [version])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
  const draft = useMemo(() => getIntakeDraft(db), [version])
  const { addInterest, resumeSheet } = useAddInterest()
  // Coming back from intake can leave a draft behind, or finish one.
  useFocusEffect(useCallback(() => reload(), []))
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

  const discardDraft = async () => {
    const confirmed = await confirmDestructive({
      title: t('me.interests.discardTitle'),
      confirmLabel: t('me.interests.discardConfirm'),
    })
    if (!confirmed) return
    clearIntakeDraft(db)
    reload()
  }

  const setStatus = (interest: Interest, status: InterestStatus) => {
    updateInterest(db, repoContext, interest.id, { status })
    track('settings_changed', { key: 'interest_status' })
    reload()
  }

  return (
    <SubScreen
      title={t('me.interests.title')}
      action={
        reordering ? (
          <Pressable accessibilityRole="button" onPress={() => setReordering(false)} hitSlop={10}>
            <Text className="font-sans-medium text-body text-cornflower-deep">
              {t('common.done')}
            </Text>
          </Pressable>
        ) : (
          // Existing users skip the welcome screen (docs/01 §1), same as the
          // selector's + on Today.
          <Pressable
            testID="me-add-interest"
            accessibilityRole="button"
            accessibilityLabel={t('me.interests.addInterest')}
            onPress={addInterest}
            hitSlop={10}
          >
            <Ionicons name="add" size={24} color={colors.ink.DEFAULT} />
          </Pressable>
        )
      }
    >
      {draft ? (
        <View className="gap-3">
          <Text className="font-heading-bold text-heading text-ink">
            {t('me.interests.unfinishedHeading')}
          </Text>
          <DraftRow draft={draft} onDiscard={() => void discardDraft()} />
        </View>
      ) : null}

      <View className="gap-3">
        {active.map((interest, index) => (
          <InterestRow
            key={interest.id}
            interest={interest}
            statusLabel={STATUS_LABEL}
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
          <Text className="font-heading-bold text-heading text-ink">
            {t('me.interests.statusArchived')}
          </Text>
          {archived.map((interest) => (
            <InterestRow
              key={interest.id}
              interest={interest}
              statusLabel={STATUS_LABEL}
              onStatus={(status) => setStatus(interest, status)}
            />
          ))}
        </View>
      ) : null}

      {interests.length === 0 && !draft ? (
        <Text className="px-3 py-10 text-center font-sans text-body text-ink-soft">
          {t('me.interests.emptyState')}
        </Text>
      ) : null}
      {resumeSheet}
    </SubScreen>
  )
}

/** Picks the intake up where it was left; the draft goes only on a confirmed discard. */
function DraftRow({ draft, onDiscard }: { draft: IntakeDraft; onDiscard: () => void }) {
  const { t } = useTranslation()
  const wantToLearn = draft.answers.wantToLearn.trim()
  return (
    <View className="flex-row items-center gap-3 rounded-card border border-hairline bg-surface p-4">
      <Pressable
        testID="me-resume-intake"
        accessibilityRole="button"
        accessibilityLabel={t('me.interests.keepGoingWith', { name: wantToLearn })}
        onPress={() => router.push('/intake')}
        className="flex-1 gap-2"
      >
        <Text className="font-heading text-body text-ink">{wantToLearn}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="font-sans-medium text-secondary text-cornflower-deep">
            {t('me.interests.keepGoing')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.cornflower.deep} />
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onDiscard} hitSlop={10}>
        <Text className="font-sans-medium text-secondary text-ink-soft">
          {t('me.interests.discardConfirm')}
        </Text>
      </Pressable>
    </View>
  )
}

function InterestRow({
  interest,
  statusLabel,
  onStatus,
  onLongPress,
  onMoveUp,
  onMoveDown,
}: {
  interest: Interest
  statusLabel: Record<InterestStatus, string>
  onStatus: (status: InterestStatus) => void
  onLongPress?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const { t } = useTranslation()
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
              accessibilityLabel={t('me.interests.moveUp', { name: interest.name })}
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
              accessibilityLabel={t('me.interests.moveDown', { name: interest.name })}
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
            label={statusLabel[status]}
            selected={interest.status === status}
            onPress={() => onStatus(status)}
          />
        ))}
      </View>
    </Pressable>
  )
}
