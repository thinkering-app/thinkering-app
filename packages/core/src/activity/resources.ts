import type { LibraryItem } from '../library/types'
import type { Page } from '../schemas/activity-doc'
import type { Block } from '../schemas/blocks'

type ResourceEmbedBlock = Extract<Block, { kind: 'resourceEmbed' }>

/**
 * Saved resources inside Activity Documents (docs/05, docs/06): which saved
 * resource a resource-shaped item is built around, and keeping the model's
 * resourceEmbed blocks tied to resources the learner actually has. Pure.
 */

export interface SavedResourceRef {
  id: string
  url: string
  goalIds?: string[] | null
}

export type ResourceMedia = ResourceEmbedBlock['media']

/** The video id in a YouTube watch, embed, shorts or youtu.be URL; undefined for anything else. */
export function youtubeVideoId(url: string): string | undefined {
  const match =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(
      url,
    )
  return match?.[1]
}

/** Only a single YouTube video plays inline; a channel, playlist or anything else is a link. */
export function resourceMediaOf(url: string): ResourceMedia {
  return youtubeVideoId(url) ? 'video' : 'article'
}

/**
 * The saved resource G5b builds a `usesResources` item around: one matched to
 * the goal, else one that serves the path generally, preferring the item's
 * media (Watch Along wants a video). Oldest first, so the same data picks the
 * same resource.
 */
export function pickResource<T extends SavedResourceRef>(
  item: Pick<LibraryItem, 'usesResources' | 'resourceMedia'> | undefined,
  goalId: string | null | undefined,
  saved: readonly T[],
): T | undefined {
  if (!item?.usesResources) return undefined
  const candidates = [
    ...(goalId ? saved.filter((r) => r.goalIds?.includes(goalId)) : []),
    ...saved.filter((r) => !r.goalIds || r.goalIds.length === 0),
  ]
  const preferred = item.resourceMedia
    ? candidates.find((r) => resourceMediaOf(r.url) === item.resourceMedia)
    : undefined
  return preferred ?? candidates[0]
}

/**
 * Ties each resourceEmbed to a saved resource. An embed of one is given its id
 * and the media its URL supports; one the model made up or remembered keeps
 * its link but never plays as a video — a guessed video id or a channel page
 * in the player is worse than a plain link.
 */
export function groundBlocks(blocks: Block[], saved: readonly SavedResourceRef[]): Block[] {
  return blocks.map((block) => (block.kind === 'resourceEmbed' ? groundEmbed(block, saved) : block))
}

export function groundPages(pages: Page[], saved: readonly SavedResourceRef[]): Page[] {
  return pages.map((page) =>
    page.blocks ? ({ ...page, blocks: groundBlocks(page.blocks, saved) } as Page) : page,
  )
}

function groundEmbed(
  block: ResourceEmbedBlock,
  saved: readonly SavedResourceRef[],
): ResourceEmbedBlock {
  const match = saved.find((r) => sameResource(r.url, block.url))
  if (match) {
    return { ...block, resourceId: match.id, url: match.url, media: resourceMediaOf(match.url) }
  }
  return {
    kind: 'resourceEmbed',
    url: block.url,
    media: 'article',
    title: block.title,
    ...(block.focus !== undefined ? { focus: block.focus } : {}),
  }
}

function sameResource(a: string, b: string): boolean {
  const videoA = youtubeVideoId(a)
  if (videoA) return videoA === youtubeVideoId(b)
  return normalizeUrl(a) === normalizeUrl(b)
}

function normalizeUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/#.*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}
