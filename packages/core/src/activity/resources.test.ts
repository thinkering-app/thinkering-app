import { describe, expect, it } from 'vitest'
import { getLibraryItem } from '../library/items'
import type { Block } from '../schemas/blocks'
import { groundBlocks, pickResource } from './resources'

const video = { id: 'r-video', url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g', goalIds: ['g1'] }
const article = { id: 'r-article', url: 'https://example.com/guide', goalIds: ['g1'] }
const general = { id: 'r-general', url: 'https://youtu.be/abcdefghijk', goalIds: [] }
const otherGoal = {
  id: 'r-other',
  url: 'https://www.youtube.com/watch?v=otherVideo1',
  goalIds: ['g2'],
}

describe('pickResource', () => {
  it('prefers the item’s media among the goal’s resources', () => {
    const saved = [article, video, otherGoal]
    expect(pickResource(getLibraryItem('watch-along'), 'g1', saved)?.id).toBe('r-video')
    expect(pickResource(getLibraryItem('guided-reading'), 'g1', saved)?.id).toBe('r-article')
  })

  it('falls back to a resource that serves the path generally, never another goal’s', () => {
    expect(pickResource(getLibraryItem('watch-along'), 'g3', [otherGoal, general])?.id).toBe(
      'r-general',
    )
    expect(pickResource(getLibraryItem('watch-along'), 'g3', [otherGoal])).toBeUndefined()
  })

  it('keeps the resource the learner chose while it’s still saved', () => {
    const saved = [video, otherGoal]
    expect(pickResource(getLibraryItem('watch-along'), 'g1', saved, 'r-other')?.id).toBe('r-other')
    expect(pickResource(getLibraryItem('watch-along'), 'g1', saved, 'r-gone')?.id).toBe('r-video')
  })

  it('picks nothing for an item that isn’t built around a resource', () => {
    expect(pickResource(getLibraryItem('retrieval-quiz'), 'g1', [video])).toBeUndefined()
  })
})

describe('groundBlocks', () => {
  const embed = (url: string, media: 'video' | 'article' = 'video'): Block => ({
    kind: 'resourceEmbed',
    url,
    media,
    title: 'A clip',
    startSec: 60,
    endSec: 120,
  })

  it('ties an embed of a saved video to it, whatever form the URL takes', () => {
    const [grounded] = groundBlocks([embed('https://youtu.be/zjkBMFhNj_g')], [video])
    expect(grounded).toMatchObject({
      resourceId: 'r-video',
      url: video.url,
      media: 'video',
      startSec: 60,
    })
  })

  it('turns an unsaved video into a plain link', () => {
    const [grounded] = groundBlocks([embed('https://www.youtube.com/watch?v=madeUpId123')], [video])
    expect(grounded).toEqual({
      kind: 'resourceEmbed',
      url: 'https://www.youtube.com/watch?v=madeUpId123',
      media: 'article',
      title: 'A clip',
    })
  })

  it('never plays a saved channel as a video', () => {
    const channel = { id: 'r-channel', url: 'https://www.youtube.com/@EasyGerman', goalIds: [] }
    const [grounded] = groundBlocks([embed('https://youtube.com/@EasyGerman/')], [channel])
    expect(grounded).toMatchObject({ resourceId: 'r-channel', media: 'article' })
  })
})
