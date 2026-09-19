import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ActivityDoc, Rating, Tier } from '@thinkering/core'

import { Button } from '@/components/button'
import { TextField } from '@/components/text-field'
import { colors } from '@/theme/tokens'
import { celebrationFor, GOAL_VERB } from './summary-copy'

/**
 * What the renderer adds to the summary page (docs/05): a heading to mark the
 * finish and a line naming the goal above G5b's concept recap (the words are in
 * `summary-copy.ts`), and below it the concept chips, the rating
 * row, and an optional note that can be sent to the developers (D18).
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
          {GOAL_VERB[tier]} <Text className="font-sans-medium text-ink">{goalTitle}</Text>.
        </Text>
      ) : null}
    </View>
  )
}

const RATINGS: {
  value: Rating
  icon: 'thumb-down-outline' | 'thumbs-up-down-outline' | 'thumb-up-outline'
  label: string
}[] = [
  { value: 'down', icon: 'thumb-down-outline', label: 'Not useful' },
  { value: 'mixed', icon: 'thumbs-up-down-outline', label: 'Mixed' },
  { value: 'up', icon: 'thumb-up-outline', label: 'Useful' },
]

export function SummaryFooter({
  doc,
  rating,
  ratingText,
  onRate,
  onShare,
  shareState,
}: {
  doc: ActivityDoc
  rating: Rating | null
  ratingText: string
  onRate: (rating: Rating, text: string) => void
  onShare: (comment: string) => void
  shareState: 'idle' | 'pending' | 'done' | 'error'
}) {
  const [text, setText] = useState(ratingText)
  const canSend = (rating !== null || text.trim() !== '') && shareState !== 'pending'

  return (
    <View className="flex-1 gap-8">
      <View className="flex-row flex-wrap gap-2">
        {doc.concepts.map((concept) => (
          <View key={concept.label} className="rounded-pill bg-cornflower-tint px-3 py-1.5">
            <Text className="font-sans-medium text-caption text-cornflower-deep">
              {concept.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Pushed to the bottom of the page when the recap is short. */}
      <View className="mt-auto gap-3">
        <Text className="text-center font-sans-medium text-body text-ink">Was this useful?</Text>
        <View className="flex-row justify-center gap-4">
          {RATINGS.map((option) => {
            const chosen = rating === option.value
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
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
            Sent — thank you.
          </Text>
        ) : (
          <>
            <TextField
              value={text}
              onChangeText={(next) => {
                setText(next)
                if (rating) onRate(rating, next)
              }}
              placeholder="Anything more? (optional)"
              accessibilityLabel="Rating detail"
              multiline
            />
            <Button
              label={shareState === 'pending' ? 'Sending…' : 'Send'}
              variant="quiet"
              disabled={!canSend}
              onPress={() => onShare(text)}
            />
            <Text className="text-center font-sans text-caption text-ink-soft">
              {shareState === 'error'
                ? "That didn't send. Try again later."
                : 'Sends this activity, your rating and your note to the developers. Your answers stay on your device.'}
            </Text>
          </>
        )}
      </View>
    </View>
  )
}
