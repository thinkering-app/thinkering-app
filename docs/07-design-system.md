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

- **Sections**: Next → cornflower · Strengthen → leaf · Go further → peach. Done today is one colour across sections — `sun`, the palette's small-celebration colour — while the section colour stays with the section. The heading gets a `sun` check (ink tick) and the day count; a done card takes its section's tint in place of white and shadow, and its time chip becomes a `sun` "Done today" chip. When a section turns done while Today is in view — coming back from a finished activity — the check springs in after the screen settles and throws off four palette dots; done at mount, on a switched interest, or with Reduce Motion on, it's simply there.
- **Goal status**: `not_started` = white card + hairline · `introduced` = cornflower-tint fill · `strengthened` = cornflower-deep fill, light text · `applied` ("Put to use") = strengthened treatment + peach edge/corner glow — celebratory, since going further is the optional flourish.
- Errors are rare; use ink text + peach accent, no harsh red.

## Typography

- **Arvo** (Google Fonts) — headings and display. 700 for screen titles and section headings, 400 for card titles. Slab serif gives the crafted, papery feel.
- **Outfit** — everything else. 400 body, 500 UI labels/buttons, 600 emphasis.
- Scale (sp): display 28 · title 22 · heading 17 · body 16 · secondary 14 · caption 12. Generous line-height (~1.45 body). Text is minimal by principle — the type scale should rarely need more than three levels on one screen.

## Texture & depth

- Subtle paper-grain overlay at 3.5% opacity — felt, not seen. It is rendered **once at the root**, over every screen and under every modal, rather than per screen: the alternative was remembering to add it to each `SafeAreaView`, and at this opacity the grain over a white card reads as paper too.
- Soft watercolor washes: a `*-tint` color fading to nothing, bleeding off an edge — the landing hero's blurred disks, drawn in the app as a radial gradient (`Wash`). Two or three at a time at the edges — never one centered shape sitting behind the words. Used sparingly: the intake welcome, every empty state (`EmptyState`), and the summary page. They were PNG blobs in the full palette colors until 2026-09-18; at any opacity those read as a shape sitting on the page rather than color in the paper.
- The raster assets — grain, the app icon, the splash mark, the Android icon layers — are **generated**, by `.context/art/make-assets.py`. Re-run it rather than hand-editing a PNG; the palette and the geometry live in that one file.
- The mark is a lowercase Arvo `t` in `paper` on a cornflower field, with a `sun` spark at its shoulder. iOS ships it as a plain `icon.png`: the layered `.icon` (Liquid Glass) format can't be judged without a device build, so it waits for one.
- Depth like Unfold: cards with soft wide shadows (`ink` at 6–8% alpha, large radius), 16–20px card corner radius, 999 for pills. One elevation step — no stacked shadow hierarchies.

## Components (build in `apps/mobile/src/components`)

- `Screen` (safe area + paper bg + feedback button slot) · `Card` (surface + soft shadow) · `Pill` (selector rows; selected = cornflower fill, white text) · `SectionHeader` (Arvo + sun check + count when done today) · `ActivityCard` (section-colored swatch pill on white + hairline, title, goal line, time chip in the section tint — the landing page's card language, no colored edge bars; done today: section-tint card, sun chip) · `ProgressBar` (segmented pages) · `ChoiceChip` (intake/topic multi-select; selected = cornflower tint + deep border, so a wrapped row of them stays readable) · `TextField` (single/multi-line; the question is the label, no label text above; optional `secureTextEntry`/`keyboardType`/`autoCapitalize`/`autoComplete` for the sign-in fields, which need the right keyboard and autofill) · `ProgressDots` (intake steps) · `Generating` (the branded wait: three palette dots breathing, no spinner) · `Sheet` (bottom sheet for configure dialogs, with `InfoDialog` for a strategy overview) · `Meter` (AI usage) · `CalendarMonth` · `NavRow` (a row that opens a screen: label, chevron, nothing else — Me's Interests and every row of the settings index) · `Button` (primary cornflower / quiet ghost) · `Toast`.
- Activity blocks each get a component mapping 1:1 to `05-activity-format.md` block kinds; interactions animate gently (spring, 200–300ms) — feedback through motion and color, not confetti.
- **Summary celebrations** (`features/activity-player/celebration.tsx`): arriving at an activity's summary gets one palette-only moment across the whole page, by section, over 2½–3½ seconds — Next: a white shine runs along the progress bar and its segments light `sun` one after another, each throwing off a few sun glints (small dots with a bright core), while a sun-tinted light settles down the page, then it all fades back; Strengthen: palette dots drift up all over the page and fade; Go further: three larger washes bloom in, flushing the palette colour for a moment before settling to the ordinary tint (the resting wash is still a tint). Each plays once per arrival, and none plays when the OS Reduce Motion setting is on (the washes simply appear). Still not confetti.
- Motion primitives: `PressScale` (the inward spring for card-sized targets — small controls keep their `active:` colour change) and `FadeIn` (a 240ms fade with a few pixels of lift, mount-only, keyed by what it wraps). `Sheet` separates its motion into a quick, in-place scrim fade and a bottom panel that slides its own height, so the dim has no moving edge. All use React Native's `Animated`; nothing here needs Reanimated's worklets. A shared `Animated.Value` is created with `useState(() => …)`, not `useRef` — reading a ref during render is a lint error under the React Compiler rules.
- Components with a `testID` prop (`Button`, `ChoiceChip`, `TextField`, `ActivityCard`, `NavRow`) carry it for the Maestro flows (`10` Tier 6), not for styling.
- Header icon actions sit in the right of the header, `ink-soft` at 22px with `hitSlop={10}`: Path's resources and settings, Interests' **+**, and Me's **⚙**. A tab that has settings puts them behind the ⚙ rather than in the scroll (`01` §7); `SubScreen` renders the pushed screen they open.

## Voice

Short, warm, plain, adult. Sentence case everywhere. No exclamation-point cheerleading, no "help text" paragraphs — if a screen needs explanation, redesign it. Praise only when specific and earned. Never patronize or assume: activity in the app is not the sum of what someone knows — write "you've covered X in thinkering", never "you haven't learned X yet" (mirrors the generated-content tone rules in `04`).

## Implementation

- Tokens live in `packages/config/tailwind` as a Tailwind preset consumed by NativeWind (app) and Tailwind (landing). No raw hex in components.
- Fonts via `@expo-google-fonts/arvo` + `@expo-google-fonts/outfit`; same families self-hosted on the landing page.
- Dark mode: out of scope for v1 (tokens are structured so it can be added as a second palette later).
