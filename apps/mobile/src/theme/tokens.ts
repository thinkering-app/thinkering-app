import preset from '@thinkering/config/tailwind'

/** Design tokens for the rare places that need raw values (navigation chrome, native APIs). */
export const colors = preset.theme.extend.colors

/** expo-google-fonts registration keys, matching tailwind.config.js fontFamily. */
export const fonts = {
  heading: 'Arvo_400Regular',
  headingBold: 'Arvo_700Bold',
  sans: 'Outfit_400Regular',
  sansMedium: 'Outfit_500Medium',
  sansSemibold: 'Outfit_600SemiBold',
} as const
