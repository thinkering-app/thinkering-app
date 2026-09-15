/**
 * Shared Tailwind preset — the single source of design tokens (docs/07-design-system.md).
 * Consumed by NativeWind (apps/mobile) and Tailwind (apps/web); also imported directly
 * where token values are needed in JS (e.g. tab bar colors). No raw hex anywhere else.
 *
 * Font families here are the CSS-facing names; apps/mobile overrides them with the
 * expo-google-fonts registration keys in its own tailwind.config.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        paper: '#FBF8F2',
        surface: '#FFFFFF',
        hairline: '#EAE4D8',
        ink: {
          DEFAULT: '#2B3A5C',
          soft: '#5C6784',
        },
        cornflower: {
          DEFAULT: '#5B82DB',
          deep: '#3D5FB8',
          tint: '#E9EFFB',
        },
        leaf: {
          DEFAULT: '#4E9F6F',
          tint: '#E6F2EA',
        },
        sun: {
          DEFAULT: '#F5CE73',
          tint: '#FBF1D8',
        },
        peach: {
          DEFAULT: '#F7A072',
          tint: '#FDEEE5',
        },
      },
      fontFamily: {
        // Arvo 400 (card titles) / 700 (screen + section titles); Outfit 400/500/600.
        heading: ['Arvo', 'var(--font-arvo)', 'serif'],
        'heading-bold': ['Arvo', 'var(--font-arvo)', 'serif'],
        sans: ['Outfit', 'var(--font-outfit)', 'sans-serif'],
        'sans-medium': ['Outfit', 'var(--font-outfit)', 'sans-serif'],
        'sans-semibold': ['Outfit', 'var(--font-outfit)', 'sans-serif'],
      },
      fontSize: {
        // docs/07 type scale (sp): display 28 · title 22 · heading 17 · body 16 · secondary 14 · caption 12
        display: ['28px', { lineHeight: '1.3' }],
        title: ['22px', { lineHeight: '1.3' }],
        heading: ['17px', { lineHeight: '1.35' }],
        body: ['16px', { lineHeight: '1.45' }],
        secondary: ['14px', { lineHeight: '1.45' }],
        caption: ['12px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        // cards 16–20px, pills 999
        card: '18px',
        pill: '999px',
      },
      boxShadow: {
        // one elevation step: ink at ~7% alpha, soft and wide
        card: '0 8px 24px rgba(43, 58, 92, 0.07)',
      },
    },
  },
}
