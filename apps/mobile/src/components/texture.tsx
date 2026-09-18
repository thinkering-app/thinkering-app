import { Image, Platform, View, type ViewStyle } from 'react-native'

import { colors } from '@/theme/tokens'

/**
 * The paper treatment (docs/07 §Texture & depth): a tiled grain over the whole
 * app, and the watercolor washes at the edges of the quiet moments. Both are
 * decoration — never behind body text, never touchable.
 */

const GRAIN = require('../../assets/images/grain.png')

/**
 * Tiled grain across the app. Rendered once at the root, above the screens and
 * below the modals, at the opacity where it is felt rather than seen.
 */
export function PaperGrain() {
  return (
    <View pointerEvents="none" className="absolute inset-0 opacity-[0.035]">
      {/* Sized inline, not by className: on web the Image gives itself the
          asset's 128px as an inline style, which beats a class — one tile. */}
      <Image source={GRAIN} resizeMode="repeat" style={{ width: '100%', height: '100%' }} />
    </View>
  )
}

export type WashColor = 'cornflower' | 'leaf' | 'sun' | 'peach'

/**
 * A palette tint fading to nothing — the landing hero's blurred wash, drawn as
 * a radial gradient. Position it with `className` so it bleeds off an edge of
 * a clipped parent; use two or three, never one centred shape.
 */
export function Wash({
  color,
  size,
  className,
}: {
  color: WashColor
  /** Diameter in pixels; the solid core is the middle third. */
  size: number
  className: string
}) {
  const tint = colors[color].tint
  const gradient = `radial-gradient(circle closest-side, ${tint} 0%, ${tint} 35%, ${tint}00 100%)`
  return (
    <View
      pointerEvents="none"
      className={`absolute opacity-60 ${className}`}
      style={[{ width: size, height: size }, gradientStyle(gradient)]}
    />
  )
}

// Native reads the gradient from the experimental prop; react-native-web
// passes `backgroundImage` straight through to CSS.
function gradientStyle(gradient: string): ViewStyle {
  return Platform.OS === 'web'
    ? ({ backgroundImage: gradient } as ViewStyle)
    : { experimental_backgroundImage: gradient }
}
