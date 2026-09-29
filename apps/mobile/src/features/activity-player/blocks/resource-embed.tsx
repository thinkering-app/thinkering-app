import Ionicons from '@expo/vector-icons/Ionicons'
import { youtubeVideoId } from '@thinkering/core'
import { Pressable, Text, View } from 'react-native'

import { openResource } from '@/resources/open'
import { colors } from '@/theme/tokens'
import { Markdown } from '../markdown'
import { VideoEmbed } from './video-embed'
import type { BlockOf } from './types'

/**
 * A resource inside an activity (docs/05): a short video segment played inline,
 * or an article as a link card. The `focus` line comes first either way —
 * knowing what to watch or read for is what makes the segment work. A "video"
 * that isn't a single YouTube video (a channel, a playlist) is a link card too.
 */
export function ResourceEmbedBlock({ block }: { block: BlockOf<'resourceEmbed'> }) {
  const embedUrl = block.media === 'video' ? youtubeEmbedUrl(block) : undefined
  return (
    <View className="gap-3">
      {block.focus ? (
        <View className="flex-row gap-2 rounded-card bg-sun-tint p-4">
          <Ionicons name="eye-outline" size={18} color={colors.ink.soft} />
          <Markdown md={block.focus} className="flex-1 font-sans text-body text-ink" />
        </View>
      ) : null}
      {embedUrl ? (
        <VideoEmbed embedUrl={embedUrl} title={block.title} />
      ) : (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={block.title}
          onPress={() => openResource(block.url)}
          className="flex-row items-center gap-3 rounded-card border border-hairline bg-surface p-4 active:bg-cornflower-tint"
        >
          <Ionicons name="document-text-outline" size={20} color={colors.cornflower.deep} />
          <View className="flex-1">
            <Text className="font-heading text-body text-ink">{block.title}</Text>
            <Text className="font-sans text-caption text-ink-soft" numberOfLines={1}>
              {hostOf(block.url)}
            </Text>
          </View>
        </Pressable>
      )}
      {embedUrl ? (
        <Text className="font-sans text-caption text-ink-soft">{block.title}</Text>
      ) : null}
    </View>
  )
}

/** The privacy-preserving embed URL for a clip, clipped to its segment; undefined if the URL isn't one video. */
function youtubeEmbedUrl(
  block: Pick<BlockOf<'resourceEmbed'>, 'url' | 'startSec' | 'endSec'>,
): string | undefined {
  const id = youtubeVideoId(block.url)
  if (!id) return undefined
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' })
  if (block.startSec !== undefined) params.set('start', String(block.startSec))
  if (block.endSec !== undefined) params.set('end', String(block.endSec))
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
}

function hostOf(url: string): string {
  return /^https?:\/\/([^/]+)/.exec(url)?.[1] ?? url
}
