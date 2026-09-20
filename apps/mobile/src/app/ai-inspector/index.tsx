import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { listLlmCalls, type LlmCall } from '@thinkering/db'

import { Screen } from '@/components/screen'
import { db } from '@/db'

function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

/** AI Inspector (docs/02 §Dev experience): the primary prompt-iteration loop. */
export default function AiInspectorScreen() {
  const [calls, setCalls] = useState<LlmCall[]>([])

  useFocusEffect(
    useCallback(() => {
      setCalls(listLlmCalls(db))
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
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/ai-inspector/[id]', params: { id: item.id } })
              }
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
                {item.latencyMs != null ? `${item.latencyMs}ms` : '–'} ·{' '}
                {formatTime(item.createdAt)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}
