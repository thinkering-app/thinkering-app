import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { weightedTokens } from '@thinkering/core'
import { listLlmCalls, llmCallTotals, type LlmCall, type LlmKindTotal } from '@thinkering/db'

import { Screen } from '@/components/screen'
import { db } from '@/db'

const DAY_MS = 24 * 60 * 60 * 1000

function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

/**
 * Where the last day's budget went, heaviest kind first, in the weighted
 * tokens the daily cap is measured in (docs/04 §Usage metering).
 *
 * What each call reported, which is a floor rather than the meter in
 * Me → Settings → AI: an aborted stream never reaches `message_delta`, so it
 * reports nothing here while the proxy charges what it streamed. The shares
 * are of what's shown, not of the day's cap — so the unreported count is on
 * the screen too rather than left to be inferred from a number that looks low.
 */
function Totals({ totals }: { totals: LlmKindTotal[] }) {
  const weighted = (t: LlmKindTotal) => weightedTokens(t.inputTokens, t.outputTokens)
  const all = totals.reduce((sum, t) => sum + weighted(t), 0)
  const unreported = totals.reduce((sum, t) => sum + t.unreported, 0)
  if (totals.length === 0) return null
  return (
    <View className="mb-3 gap-2 rounded-card bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-medium text-body text-ink">Last 24 hours</Text>
        <Text className="font-sans-medium text-body text-ink">
          {formatTokens(all)} weighted
        </Text>
      </View>
      {totals.map((total) => (
        <View key={total.kind} className="flex-row items-center justify-between">
          <Text className="font-sans text-caption text-ink-soft">
            {total.kind} · {total.calls}
          </Text>
          <Text className="font-sans text-caption text-ink-soft">
            in {formatTokens(total.inputTokens)} / out {formatTokens(total.outputTokens)} ·{' '}
            {all > 0 ? Math.round((100 * weighted(total)) / all) : 0}%
          </Text>
        </View>
      ))}
      {unreported > 0 ? (
        <Text className="font-sans text-caption text-ink-soft">
          {unreported} {unreported === 1 ? 'call' : 'calls'} reported no tokens, so nothing above
          counts them — the proxy still charged what they streamed.
        </Text>
      ) : null}
    </View>
  )
}

/** AI Inspector (docs/02 §Dev experience): the primary prompt-iteration loop. */
export default function AiInspectorScreen() {
  const [calls, setCalls] = useState<LlmCall[]>([])
  const [totals, setTotals] = useState<LlmKindTotal[]>([])

  useFocusEffect(
    useCallback(() => {
      setCalls(listLlmCalls(db))
      setTotals(llmCallTotals(db, Date.now() - DAY_MS))
    }, []),
  )

  return (
    <Screen title="AI Inspector" feedback={false}>
      <Pressable onPress={() => router.back()} className="mb-3 self-start">
        <Text className="font-sans text-secondary text-cornflower">‹ Back</Text>
      </Pressable>
      {calls.length === 0 ? (
        <Text className="font-sans text-body text-ink-soft">No calls logged yet.</Text>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Totals totals={totals} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/ai-inspector/[id]', params: { id: item.id } })}
              className="mb-2 rounded-card bg-surface p-4"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-medium text-body text-ink">{item.kind}</Text>
                <Text
                  className={
                    item.status === 'ok'
                      ? 'font-sans-medium text-caption text-leaf'
                      : 'font-sans-medium text-caption text-peach'
                  }
                >
                  {item.status}
                </Text>
              </View>
              <Text className="mt-1 font-sans text-caption text-ink-soft">
                {item.model} · in {item.inputTokens ?? '–'} / out {item.outputTokens ?? '–'} ·{' '}
                {item.latencyMs != null ? `${item.latencyMs}ms` : '–'} · {formatTime(item.createdAt)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}
