import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ActivityDoc, Rating } from '@thinkering/core'

import { Button } from '@/components/button'
import { TextField } from '@/components/text-field'
import { colors } from '@/theme/tokens'

/**
 * The summary page's appended half (docs/05): the rating row, an optional
 * detail, and the quiet per-activity share action (D18). G5b wrote the concept
 * recap above it.
 */

const RATINGS: {
  value: Rating
  icon: 'thumbs-down-outline' | 'remove-outline' | 'thumbs-up-outline'
  label: string
}[] = [
  { value: 'down', icon: 'thumbs-down-outline', label: 'Not useful' },
  { value: 'mixed', icon: 'remove-outline', label: 'Mixed' },
  { value: 'up', icon: 'thumbs-up-outline', label: 'Useful' },
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
  onShare: (includeResponses: boolean) => void
  shareState: 'idle' | 'pending' | 'done' | 'error'
}) {
  const [text, setText] = useState(ratingText)
  const [sharing, setSharing] = useState(false)
  const [includeResponses, setIncludeResponses] = useState(false)

  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap gap-2">
        {doc.concepts.map((concept) => (
          <View key={concept.label} className="rounded-pill bg-cornflower-tint px-3 py-1.5">
            <Text className="font-sans-medium text-caption text-cornflower-deep">
              {concept.label}
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-3">
        <Text className="font-sans-medium text-body text-ink">Was this useful?</Text>
        <View className="flex-row gap-3">
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
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={chosen ? colors.cornflower.deep : colors.ink.soft}
                />
              </Pressable>
            )
          })}
        </View>
        {rating ? (
          <TextField
            value={text}
            onChangeText={(next) => {
              setText(next)
              onRate(rating, next)
            }}
            placeholder="Anything more? (optional)"
            accessibilityLabel="Rating detail"
            multiline
          />
        ) : null}
      </View>

      <View className="gap-3">
        {sharing ? (
          <View className="gap-3 rounded-card border border-hairline bg-surface p-4">
            <Text className="font-sans text-secondary text-ink-soft">
              Sends this activity and your rating to the developers.
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: includeResponses }}
              accessibilityLabel="Include my answers"
              onPress={() => setIncludeResponses((v) => !v)}
              className="flex-row items-center gap-2"
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded border ${
                  includeResponses
                    ? 'border-cornflower-deep bg-cornflower'
                    : 'border-hairline bg-surface'
                }`}
              >
                {includeResponses ? (
                  <Ionicons name="checkmark" size={13} color={colors.surface} />
                ) : null}
              </View>
              <Text className="font-sans text-secondary text-ink">Include my answers</Text>
            </Pressable>
            <Button
              label={shareState === 'pending' ? 'Sending…' : 'Send'}
              variant="quiet"
              disabled={shareState === 'pending'}
              onPress={() => onShare(includeResponses)}
            />
          </View>
        ) : shareState === 'done' ? (
          <Text className="font-sans text-caption text-ink-soft">Shared — thank you.</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSharing(true)}
            className="self-start py-2"
          >
            <Text className="font-sans text-caption text-ink-soft underline">
              Share this activity with the developers
            </Text>
          </Pressable>
        )}
        {shareState === 'error' ? (
          <Text className="font-sans text-caption text-ink-soft">
            That didn&apos;t send. Try again later.
          </Text>
        ) : null}
      </View>
    </View>
  )
}
