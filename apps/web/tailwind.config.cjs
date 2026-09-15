const preset = require('@thinkering/config/tailwind')

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [preset],
  theme: {
    extend: {
      fontSize: {
        // Landing-only display sizes; the shared scale tops out at 28px, which is
        // right for the app but too small for a marketing hero.
        'display-lg': ['clamp(2.25rem, 1.5rem + 3.5vw, 3.5rem)', { lineHeight: '1.12' }],
        'display-md': ['clamp(1.75rem, 1.4rem + 1.6vw, 2.25rem)', { lineHeight: '1.2' }],
      },
    },
  },
}
