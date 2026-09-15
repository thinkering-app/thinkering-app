import { ScrollView, View } from 'react-native'

import { Pill } from '@/components/pill'
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
 * exploring interest (docs/01 §2).
 */
export function InterestSelector({ allowAll = true }: InterestSelectorProps = {}) {
  const { focus, exploring, selection, select } = useInterestSelection()
  if (focus.length + exploring.length <= 1) return null

  const exploreOpen = selection?.kind === 'explore'
  // Without All, the Explore pill stands for the first exploring interest.
  const exploreDefault = allowAll ? null : (exploring[0]?.id ?? null)

  return (
    <View className="gap-2">
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
