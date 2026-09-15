# 07 — Design system

Direction: clean and professional with creative warmth. Influences: stoic's card-first calm structure, Unfold's simplicity/soft depth, kodolab's confident color blocking, and a light papery/watercolor texture. Adult, grounding, enjoyable — not a health/meditation app, not childish. Whitespace does the organizing; color does the delighting.

## Color tokens

Hero is cornflower; ink is the workhorse text/dark color; green, sun, and peach are pops. No mucky/gray-leaning mixes. Body text is always ink on paper/white (AA). Cornflower/green/peach on white are for large text, fills, and accents only — verify AA (4.5:1) before using any colored text under 18px.

| token             | hex       | use                                                                      |
| ----------------- | --------- | ------------------------------------------------------------------------ |
| `paper`           | `#FBF8F2` | app background (warm off-white, not gray)                                |
| `surface`         | `#FFFFFF` | cards                                                                    |
| `hairline`        | `#EAE4D8` | borders, dividers                                                        |
| `ink`             | `#2B3A5C` | primary text, dark surfaces (warm dark blue)                             |
| `ink-soft`        | `#5C6784` | secondary text                                                           |
| `cornflower`      | `#5B82DB` | hero: primary actions, selection, Next accent                            |
| `cornflower-deep` | `#3D5FB8` | pressed states, strengthened-goal fill, text-on-tint                     |
| `cornflower-tint` | `#E9EFFB` | introduced-goal wash, selected pills                                     |
| `leaf`            | `#4E9F6F` | Strengthen accent, success                                               |
| `leaf-tint`       | `#E6F2EA` | washes                                                                   |
| `sun`             | `#F5CE73` | highlights, calendar marks, small celebrations                           |
| `sun-tint`        | `#FBF1D8` | washes                                                                   |
| `peach`           | `#F7A072` | Go further accent, "Put to use" celebration — bright and warm, not muddy |
| `peach-tint`      | `#FDEEE5` | washes                                                                   |

Semantic mappings:

- **Sections**: Next → cornflower · Strengthen → leaf · Go further → peach. Section headings get their tint as a wash when completed today (plus the day count).
- **Goal status**: `not_started` = white card + hairline · `introduced` = cornflower-tint fill · `strengthened` = cornflower-deep fill, light text · `applied` ("Put to use") = strengthened treatment + peach edge/corner glow — celebratory, since going further is the optional flourish.
- Errors are rare; use ink text + peach accent, no harsh red.

## Typography

- **Arvo** (Google Fonts) — headings and display. 700 for screen titles and section headings, 400 for card titles. Slab serif gives the crafted, papery feel.
- **Outfit** — everything else. 400 body, 500 UI labels/buttons, 600 emphasis.
- Scale (sp): display 28 · title 22 · heading 17 · body 16 · secondary 14 · caption 12. Generous line-height (~1.45 body). Text is minimal by principle — the type scale should rarely need more than three levels on one screen.

## Texture & depth

- Subtle paper-grain overlay on `paper` background (one tiny tiled noise asset at ~3–4% opacity) — felt, not seen.
- Soft watercolor blob assets (pre-made static PNGs/SVGs in the palette colors, blurred edges) used sparingly: behind the intake welcome, empty states, and the summary page. Never behind body text.
- Depth like Unfold: cards with soft wide shadows (`ink` at 6–8% alpha, large radius), 16–20px card corner radius, 999 for pills. One elevation step — no stacked shadow hierarchies.

## Components (build in `apps/mobile/src/components`)

- `Screen` (safe area + paper bg + feedback button slot) · `Card` (surface + soft shadow) · `Pill` (selector rows; selected = cornflower fill, white text) · `SectionHeader` (Arvo + accent + completed wash + count) · `ActivityCard` (title, goal line, time chip) · `ProgressBar` (segmented pages) · `ChoiceChip` (intake/topic multi-select; selected = cornflower tint + deep border, so a wrapped row of them stays readable) · `TextField` (single/multi-line; the question is the label, no label text above) · `ProgressDots` (intake steps) · `Generating` (the branded wait: three palette dots breathing, no spinner) · `Sheet` (configure dialogs) · `Meter` (AI usage) · `CalendarMonth` · `Button` (primary cornflower / quiet ghost) · `Toast`.
- Activity blocks each get a component mapping 1:1 to `05-activity-format.md` block kinds; interactions animate gently (spring, 200–300ms) — feedback through motion and color, not confetti.

## Voice

Short, warm, plain, adult. Sentence case everywhere. No exclamation-point cheerleading, no "help text" paragraphs — if a screen needs explanation, redesign it. Praise only when specific and earned. Never patronize or assume: activity in the app is not the sum of what someone knows — write "you've covered X in thinkering", never "you haven't learned X yet" (mirrors the generated-content tone rules in `04`).

## Implementation

- Tokens live in `packages/config/tailwind` as a Tailwind preset consumed by NativeWind (app) and Tailwind (landing). No raw hex in components.
- Fonts via `@expo-google-fonts/arvo` + `@expo-google-fonts/outfit`; same families self-hosted on the landing page.
- Dark mode: out of scope for v1 (tokens are structured so it can be added as a second palette later).
