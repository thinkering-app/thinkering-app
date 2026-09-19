import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, ScrollView, View } from 'react-native'

import { Pill } from '@/components/pill'
import { useAddInterest } from '@/intake/add-interest'
import { colors } from '@/theme/tokens'
import { useInterestSelection } from './selection'

type InterestSelectorProps = {
  /**
   * Path has no "All" — it always shows a single interest (docs/01 §2), so its
   * Explore row opens on the first exploring interest instead.
   */
  allowAll?: boolean
}

/**
 * One pill per in-focus interest, plus an Explore pill when exploring
 * interests exist; choosing Explore reveals a second row of All + each
 * exploring interest (docs/01 §2). The row stays put at one interest — it is
 * where you add the next one.
 */
export function InterestSelector({ allowAll = true }: InterestSelectorProps = {}) {
  const { focus, exploring, selection, select } = useInterestSelection()
  // With nothing to select between, the screen's empty state carries the add.
  if (focus.length + exploring.length === 0) return null

  const exploreOpen = selection?.kind === 'explore'
  // Without All, the Explore pill stands for the first exploring interest.
  const exploreDefault = allowAll ? null : (exploring[0]?.id ?? null)

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Row>
            {focus.map((interest) => (
              <Pill
                key={interest.id}
                label={interest.name}
                selected={selection?.kind === 'interest' && selection.interestId === interest.id}
                onPress={() => select({ kind: 'interest', interestId: interest.id })}
              />
            ))}
            {exploring.length > 0 ? (
              <Pill
                label="Explore"
                selected={exploreOpen}
                onPress={() => select({ kind: 'explore', interestId: exploreDefault })}
              />
            ) : null}
          </Row>
        </View>
        <AddInterest />
      </View>
      {exploreOpen ? (
        <Row>
          {allowAll ? (
            <Pill
              label="All"
              selected={selection.interestId === null}
              onPress={() => select({ kind: 'explore', interestId: null })}
            />
          ) : null}
          {exploring.map((interest) => (
            <Pill
              key={interest.id}
              label={interest.name}
              selected={
                selection.interestId === interest.id ||
                (!allowAll && selection.interestId === null && interest.id === exploreDefault)
              }
              onPress={() => select({ kind: 'explore', interestId: interest.id })}
            />
          ))}
        </Row>
      ) : null}
    </View>
  )
}

/**
 * Pinned beside the scrolling pills so it survives a long row. Existing users
 * skip the welcome screen and go straight to the first question (docs/01 §1),
 * or back to an unfinished one.
 */
function AddInterest() {
  const { addInterest, resumeSheet } = useAddInterest()
  return (
    <>
      <Pressable
        testID="add-interest"
        accessibilityRole="button"
        accessibilityLabel="Add an interest"
        onPress={addInterest}
        hitSlop={8}
        className="rounded-pill border border-hairline bg-surface px-3 py-2 active:bg-cornflower-tint"
      >
        <View className="h-5 w-5 items-center justify-center">
          <Ionicons name="add" size={18} color={colors.ink.soft} />
        </View>
      </Pressable>
      {resumeSheet}
    </>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pr-5"
    >
      {children}
    </ScrollView>
  )
}
