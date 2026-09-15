import { Text, View } from 'react-native'
import { Markdown } from '../markdown'
import type { BlockOf } from './types'

/** The non-interactive blocks (docs/05): heading, paragraph, list, callout, steps. */

export function HeadingBlock({ block }: { block: BlockOf<'heading'> }) {
  return <Text className="font-heading-bold text-title text-ink">{block.text}</Text>
}

export function ParagraphBlock({ block }: { block: BlockOf<'paragraph'> }) {
  return <Markdown md={block.md} />
}

export function ListBlock({ block }: { block: BlockOf<'list'> }) {
  return (
    <View className="gap-2">
      {block.items.map((item, i) => (
        <View key={i} className="flex-row gap-2">
          <Text className="font-sans text-body text-ink-soft">
            {block.style === 'numbered' ? `${i + 1}.` : '•'}
          </Text>
          <Markdown md={item} className="flex-1 font-sans text-body text-ink" />
        </View>
      ))}
    </View>
  )
}

const CALLOUT_TONE = {
  note: 'bg-cornflower-tint',
  example: 'bg-sun-tint',
  tip: 'bg-leaf-tint',
} as const

export function CalloutBlock({ block }: { block: BlockOf<'callout'> }) {
  return (
    <View className={`rounded-card p-4 ${CALLOUT_TONE[block.tone]}`}>
      <Markdown md={block.md} />
    </View>
  )
}

export function StepsBlock({ block }: { block: BlockOf<'steps'> }) {
  return (
    <View className="gap-4 rounded-card bg-surface p-5 shadow-card">
      {block.items.map((step, i) => (
        <View key={i} className="gap-1">
          <View className="flex-row items-center gap-2">
            <View className="h-6 w-6 items-center justify-center rounded-pill bg-cornflower-tint">
              <Text className="font-sans-medium text-caption text-cornflower-deep">{i + 1}</Text>
            </View>
            <Text className="flex-1 font-sans-semibold text-body text-ink">{step.label}</Text>
          </View>
          <Markdown md={step.md} className="pl-8 font-sans text-body text-ink-soft" />
        </View>
      ))}
    </View>
  )
}
