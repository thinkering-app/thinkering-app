import Ionicons from '@expo/vector-icons/Ionicons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import type { ActivityDoc, Rating, Tier } from '@thinkering/core'

import { Button } from '@/components/button'
import { InfoDialog } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { colors } from '@/theme/tokens'
import { celebrationFor, GOAL_LINE_KEY } from './summary-copy'

/**
 * What the renderer adds to the summary page (docs/05): a heading to mark the
 * finish and a line naming the goal above G5b's concept recap (the words are in
 * `summary-copy.ts`), and below it the concept chips, the activity type, the
 * rating row, and an optional note that can be sent to the developers (D18).
 */

export function SummaryHeader({
  celebrationKey,
  tier,
  goalTitle,
}: {
  celebrationKey: string
  tier: Tier
  /** The goal the activity served; absent, the line under the heading is left out. */
  goalTitle?: string
}) {
  return (
    <View className="gap-2">
      <Text className="font-heading-bold text-display text-ink">
        {celebrationFor(celebrationKey)}
      </Text>
      {goalTitle ? (
        <Text className="font-sans text-body text-ink-soft">
          <Trans
            i18nKey={GOAL_LINE_KEY[tier]}
            values={{ goal: goalTitle }}
            components={{ bold: <Text className="font-sans-medium text-ink" /> }}
          />
        </Text>
      ) : null}
    </View>
  )
}

const RATINGS: {
  value: Rating
  icon: 'thumb-down-outline' | 'thumbs-up-down-outline' | 'thumb-up-outline'
  labelKey:
    'player.summary.rating.down' | 'player.summary.rating.mixed' | 'player.summary.rating.up'
}[] = [
  { value: 'down', icon: 'thumb-down-outline', labelKey: 'player.summary.rating.down' },
  { value: 'mixed', icon: 'thumbs-up-down-outline', labelKey: 'player.summary.rating.mixed' },
  { value: 'up', icon: 'thumb-up-outline', labelKey: 'player.summary.rating.up' },
]

export function SummaryFooter({
  doc,
  libraryItem,
  rating,
  ratingText,
  onRate,
  onShare,
  shareState,
}: {
  doc: ActivityDoc
  /** The library item it was made from, named under the concepts. */
  libraryItem?: { name: string; about: string }
  rating: Rating | null
  ratingText: string
  onRate: (rating: Rating, text: string) => void
  onShare: (comment: string) => void
  shareState: 'idle' | 'pending' | 'done' | 'error'
}) {
  const { t } = useTranslation()
  const [text, setText] = useState(ratingText)
  const [aboutOpen, setAboutOpen] = useState(false)
  const canSend = (rating !== null || text.trim() !== '') && shareState !== 'pending'

  return (
    <View className="flex-1 gap-8">
      <View className="gap-3">
        <View className="flex-row flex-wrap gap-2">
          {doc.concepts.map((concept) => (
            <View key={concept.label} className="rounded-pill bg-cornflower-tint px-3 py-1.5">
              <Text className="font-sans-medium text-caption text-cornflower-deep">
                {concept.label}
              </Text>
            </View>
          ))}
        </View>
        {libraryItem ? (
          <View className="flex-row items-center gap-1.5">
            <Text className="font-sans text-secondary text-ink-soft">
              <Trans
                i18nKey="player.summary.activityType"
                values={{ name: libraryItem.name }}
                components={{ bold: <Text className="font-sans-medium text-ink" /> }}
              />
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('player.summary.aboutItem', { name: libraryItem.name })}
              onPress={() => setAboutOpen(true)}
              hitSlop={10}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.ink.soft} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Pushed to the bottom of the page when the recap is short. */}
      <View className="mt-auto gap-3">
        <Text className="text-center font-sans-medium text-body text-ink">
          {t('player.summary.ratingPrompt')}
        </Text>
        <View className="flex-row justify-center gap-4">
          {RATINGS.map((option) => {
            const chosen = rating === option.value
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={t(option.labelKey)}
                accessibilityState={{ selected: chosen }}
                onPress={() => onRate(option.value, text)}
                className={`h-12 w-12 items-center justify-center rounded-pill border ${
                  chosen
                    ? 'border-cornflower-deep bg-cornflower-tint'
                    : 'border-hairline bg-surface'
                }`}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={20}
                  color={chosen ? colors.cornflower.deep : colors.ink.soft}
                />
              </Pressable>
            )
          })}
        </View>

        {shareState === 'done' ? (
          <Text className="text-center font-sans text-secondary text-ink-soft">
            {t('player.summary.sent')}
          </Text>
        ) : (
          <>
            <TextField
              value={text}
              onChangeText={(next) => {
                setText(next)
                if (rating) onRate(rating, next)
              }}
              placeholder={t('player.summary.notePlaceholder')}
              accessibilityLabel={t('player.summary.noteLabel')}
              multiline
            />
            {/* Above Send. It keeps docs/08's promise: the learner's own answers never go. */}
            <Text className="text-center font-sans text-caption text-ink-soft">
              {t('player.summary.shareHelp')}
            </Text>
            <Button
              label={t(shareState === 'pending' ? 'player.summary.sending' : 'player.summary.send')}
              variant="quiet"
              disabled={!canSend}
              onPress={() => onShare(text)}
            />
            {shareState === 'error' ? (
              <Text className="text-center font-sans text-caption text-ink-soft">
                {t('player.summary.sendError')}
              </Text>
            ) : null}
          </>
        )}
      </View>
      {libraryItem ? (
        <InfoDialog
          visible={aboutOpen}
          onClose={() => setAboutOpen(false)}
          title={libraryItem.name}
          body={libraryItem.about}
        />
      ) : null}
    </View>
  )
}
