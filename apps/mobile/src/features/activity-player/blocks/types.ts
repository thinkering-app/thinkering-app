import type { Block } from '@thinkering/core'

/** One block kind's data, for the component that renders it. */
export type BlockOf<K extends Block['kind']> = Extract<Block, { kind: K }>
