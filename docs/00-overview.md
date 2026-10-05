# 00 — Overview

## Vision

thinkering helps adults make steady, real progress on things they want to learn — LLMs, personal finance, drawing, German, chess — in the time they actually have. It turns "I want to learn X" into a sequenced path of well-scoped goals, then generates a short interactive activity or two each day. The daily rhythm is deliberately simple: do one **Next**, one **Strengthen**, and — if it suits your fancy — a **Go further**.

It should feel enjoyable and grounding: clean and professional with creative warmth, not a health/meditation app and not a gamified streak machine.

## Canonical vocabulary

Use these terms exactly, in code and copy.

| Term             | Meaning                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Interest**     | Something the user wants to learn ("Get conversational in German"). Has a **mode** — **In focus** / **Exploring** / **Archived** — suggested at intake (D15), changeable.   |
| **Goal**         | One well-scoped unit in an interest's path — key concepts and skills teachable in one session. Ordered.                                                                     |
| **Goal status**  | `not_started` → `introduced` → `strengthened` → `applied` (shown as **"Put to use"**, D1). Only moves forward; each step is reached by completing an activity of that tier. |
| **Section**      | A Today lane: **Next** (introduce), **Strengthen** (consolidate), **Go further** (apply or extend).                                                                         |
| **Activity**     | A generated multi-page interactive session targeting one goal, structured by a library item.                                                                                |
| **Library item** | A reusable learning strategy (Worked Example, Retrieval Practice, Scenario Challenge…) grounded in learning science. See `06`.                                              |
| **Path**         | The ordered list of goals for an interest, plus suggestions.                                                                                                                |
| **Resource**     | A user-added or app-found link (article, video) usable as activity material.                                                                                                |
| **Reflection**   | The "Check in" flow: reflect, or add what you want to learn, and update the path.                                                                                           |
| **Intake**       | The flow that creates an interest (`01` §1).                                                                                                                                |

## Decisions

Decisions that shape the code. Change one only with a doc update that says why. Code cites them by number.

- **D1 — "Put to use".** The third goal state displays as **"Put to use"** (`applied` in code). The Today section keeps the name **Go further** and covers two flavors: _applying_ learning and _extending_ it (`06`). History wording comes from the library item's `outcomeLabel` — "Put to use [goal]", "Went deeper on [goal]", "Branched out from [goal]" — because the item knows what it did.
- **D2 — Monorepo.** `apps/mobile` (Expo), `apps/web` (Next.js landing + API), shared `packages/`. One repo, shared types and tokens.
- **D3 — Local store.** expo-sqlite + Drizzle ORM on iOS, Android and web (wasm/OPFS): typed schema, real migrations, local-first.
- **D4 — AI proxy.** LLM calls go through a thin Vercel API proxy that holds the Anthropic key and meters per device. BYO-key mode calls Anthropic directly. A secret can't ship in the app binary, and metering needs a server anyway.
- **D5 — Activities are data, not code.** A versioned, Zod-validated Activity Document rendered by a native block renderer (`05`): safe, consistent, replayable offline, testable.
- **D6 — Sync.** Row-level last-write-wins over `updated_at` with tombstones, plus JSON export/import. No CRDT framework: single-user data doesn't need one.
- **D7 — Deterministic scheduling.** What shows on Today is pure TS; the model only writes content. Predictable, testable, cheap.
- **D8 — Styling.** NativeWind in the app and Tailwind on the landing page, one token set. Arvo for headings, Outfit for body (`07`).
- **D9 — Analytics on by default.** PostHog with an anonymous random id, event names and coarse properties only — never content or titles. Not asked in the app; described on the Privacy page; one toggle turns it off, and that choice survives Delete all data. It was opt-in until 2026-09-21, which left too little data to learn from in a small beta. Revisit before an EU launch (`08`).
- **D10 — Device identity.** A server-issued device token (id + HMAC secret in SecureStore) with daily budgets; iOS App Attest later (`02`).
- **D11 — Models.** Sonnet for path and activity generation, where pedagogy matters; Haiku for small fast calls. Prompt caching on the shared preamble (`04`).
- **D12 — Day boundary.** Device-local midnight. No server clock needed.
- **D13 — License.** AGPL-3.0, intentionally.
- **D14 — Usage cap.** About 60 generations per device per day in the beta, with reserved headroom so in-activity calls (review page, Ask) never starve. Tune with real data (`04` §Usage metering).
- **D15 — Mode at intake.** Daily / several-times-a-week, or a career / personal-goal motivation → **In focus**; for fun + when I can → **Exploring**. Shown subtly at the end of intake, one tap to change.
- **D16 — Concepts and skills are first-class.** Goals carry structured concept/skill items; activities declare which they target; Path shows coverage under an expanded goal.
- **D17 — Schema compatibility.** Additive-first migrations, versioned ActivityDoc and export payloads, sync gated on a minimum schema version (`02`). Old builds must never corrupt or misread data.
- **D18 — Activity quality review.** Aggregate ratings go through PostHog; content-level review only through an explicit per-activity "share with the developers" action (`08`).
- **D19 — Supabase.** Email/password auth only; v1 sync has backup/restore semantics, not live multi-device. Landing and API on Vercel at `thinkering.app`.
- **D20 — Testing.** Tiered and explicit (`10`): `pnpm verify` is the gate; effort concentrates in `packages/core` and the migration chain; the LLM boundary is tested against recorded fixtures, never live calls; **fixture AI mode** runs the whole app deterministically at zero token cost.
- **D21 — Two feedback channels.** A public Featurebase portal for community feedback; signed, Resend-backed routes for private feedback and activity reports. Only coarse app context is attached, and content never enters analytics.
- **D22 — Session replay is a separate opt-in.** Off by default, asked once on the intake welcome screen with both answers weighted the same, and the copy says plainly that recordings show your activities and what you type. Email, password and API key fields are masked.
