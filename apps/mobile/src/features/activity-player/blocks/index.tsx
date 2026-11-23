import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import type { Block } from '@thinkering/core'

import { CalloutBlock, HeadingBlock, ListBlock, ParagraphBlock, StepsBlock } from './content'
import { FillBlankBlock } from './fill-blank'
import { FreeTextBlock } from './free-text'
import { MatchingBlock } from './matching'
import { McqBlock } from './mcq'
import { OrderingBlock } from './ordering'
import { ResourceEmbedBlock } from './resource-embed'
import { RevealBlock } from './reveal'
import { SelfRateBlock } from './self-rate'

/**
 * Block kind → component, 1:1 with docs/05. Unknown kinds render the
 * forward-compatibility placeholder rather than taking the page down: a
 * document written by a newer app version must still be readable.
 */
export function BlockView({ pageId, block }: { pageId: string; block: Block }) {
  switch (block.kind) {
    case 'heading':
      return <HeadingBlock block={block} />
    case 'paragraph':
      return <ParagraphBlock block={block} />
    case 'list':
      return <ListBlock block={block} />
    case 'callout':
      return <CalloutBlock block={block} />
    case 'steps':
      return <StepsBlock block={block} />
    case 'resourceEmbed':
      return <ResourceEmbedBlock block={block} />
    case 'mcq':
      return <McqBlock pageId={pageId} block={block} />
    case 'freeText':
      return <FreeTextBlock pageId={pageId} block={block} />
    case 'fillBlank':
      return <FillBlankBlock pageId={pageId} block={block} />
    case 'ordering':
      return <OrderingBlock pageId={pageId} block={block} />
    case 'matching':
      return <MatchingBlock pageId={pageId} block={block} />
    case 'reveal':
      return <RevealBlock pageId={pageId} block={block} />
    case 'selfRate':
      return <SelfRateBlock pageId={pageId} block={block} />
    default:
      return <UnknownBlock />
  }
}

export function UnknownBlock() {
  const { t } = useTranslation()
  return (
    <View className="rounded-card border border-hairline bg-surface p-4">
      <Text className="font-sans text-body text-ink-soft">{t('player.unknownBlock')}</Text>
    </View>
  )
}
