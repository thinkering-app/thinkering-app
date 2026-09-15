import { Image, View } from 'react-native'

/**
 * The paper treatment (docs/07 §Texture & depth): a tiled grain over the whole
 * app, and the watercolor blobs that sit behind empty states and the quiet
 * moments. Both are decoration — never behind body text, never touchable.
 */

const GRAIN = require('../../assets/images/grain.png')

const BLOBS = {
  cornflower: require('../../assets/images/blob-cornflower.png'),
  peach: require('../../assets/images/blob-peach.png'),
  leaf: require('../../assets/images/blob-leaf.png'),
  sun: require('../../assets/images/blob-sun.png'),
} as const

export type BlobColor = keyof typeof BLOBS

/**
 * Tiled grain across the app. Rendered once at the root, above the screens and
 * below the modals, at the opacity where it is felt rather than seen.
 */
export function PaperGrain() {
  return (
    <View pointerEvents="none" className="absolute inset-0 opacity-[0.035]">
      <Image source={GRAIN} resizeMode="repeat" className="h-full w-full" />
    </View>
  )
}

/**
 * A watercolor wash behind something quiet. `size` is in pixels because these
 * are deliberately larger than their container — the blob should bleed past
 * the content it sits behind.
 */
export function Watercolor({
  color = 'cornflower',
  size = 260,
  opacity = 0.5,
}: {
  color?: BlobColor
  size?: number
  opacity?: number
}) {
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <Image source={BLOBS[color]} style={{ width: size, height: size, opacity }} />
    </View>
  )
}
