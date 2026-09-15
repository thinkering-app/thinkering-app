import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { getLlmCall, type LlmCall } from '@thinkering/db'
import type { RenderedPrompt } from '@thinkering/core'

import { Screen } from '@/components/screen'
import { db } from '@/db'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-1 font-sans-semibold text-secondary text-ink">{title}</Text>
      <View className="rounded-card bg-surface p-3">{children}</View>
    </View>
  )
}

function Mono({ children }: { children: string }) {
  return <Text className="font-sans text-caption text-ink">{children}</Text>
}

export default function AiCallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const call: LlmCall | undefined = id ? getLlmCall(db, id) : undefined

  if (!call) {
    return (
      <Screen title="Call" feedback={false}>
        <Text className="font-sans text-body text-ink-soft">Call not found.</Text>
      </Screen>
    )
  }

  const request = call.request as RenderedPrompt | null
  const response = call.response as { text?: string } | null

  return (
    <Screen title={call.kind} feedback={false}>
      <Pressable onPress={() => router.back()} className="mb-3 self-start">
        <Text className="font-sans text-secondary text-cornflower">‹ Back</Text>
      </Pressable>
      <ScrollView className="flex-1">
        <Section title="Call">
          <Mono>
            {`model: ${call.model}\nstatus: ${call.status}${call.error ? `\nerror: ${call.error}` : ''}\ntokens: in ${call.inputTokens ?? '–'} / out ${call.outputTokens ?? '–'}\nlatency: ${call.latencyMs != null ? `${call.latencyMs}ms` : '–'}\nat: ${new Date(call.createdAt).toISOString()}`}
          </Mono>
        </Section>
        {request?.system?.map((block, i) => (
          <Section key={i} title={`System ${i + 1}${block.cache ? ' · cached' : ''}`}>
            <Mono>{block.text}</Mono>
          </Section>
        ))}
        {request?.messages?.map((message, i) => (
          <Section key={`m${i}`} title={`Message ${i + 1} · ${message.role}`}>
            <Mono>{message.content}</Mono>
          </Section>
        ))}
        {response?.text ? (
          <Section title="Response">
            <Mono>{response.text}</Mono>
          </Section>
        ) : null}
        <View className="h-8" />
      </ScrollView>
    </Screen>
  )
}
