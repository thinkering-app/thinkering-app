const preset = require('@thinkering/config/tailwind')

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), preset],
  theme: {
    extend: {
      // Map the shared font tokens to the expo-google-fonts registration keys.
      fontFamily: {
        heading: 'Arvo_400Regular',
        'heading-bold': 'Arvo_700Bold',
        sans: 'Outfit_400Regular',
        'sans-medium': 'Outfit_500Medium',
        'sans-semibold': 'Outfit_600SemiBold',
      },
    },
  },
}
