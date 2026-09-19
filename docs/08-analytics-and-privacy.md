# 08 — Analytics & privacy

## Stance

Learning data is personal. It lives on the device; the only ways it leaves are the LLM proxy (to generate content — not stored server-side), opt-in Supabase backup, community or private feedback the user deliberately submits, and explicit activity reports. Telemetry must be useful for product decisions while never containing learning or feedback content or identity.

## PostHog setup

- `posthog-react-native`, **US host** (`https://us.i.posthog.com`), named in the privacy copy. The region is a project-creation choice PostHog can't undo — moving would mean a new project and a new key. Configured by `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_POSTHOG_HOST`; with no key the wrapper is inert — nothing captured, nothing buffered, and the one-time ask never appears.
- **Identity**: a locally generated random UUID as `distinct_id` — the SDK's own anonymous id, persisted in our `settings` table through a `customStorage` adapter rather than a file of its own. Never call `identify()` with email/user id — even when the user creates a Supabase backup account, telemetry stays unlinked (D9).
- **No IP, no location**: every capture carries `$ip: null` (which stops PostHog recording the address at all) on top of `disableGeoip: true` (which only suppresses the lookup). Belt and braces, because the address is the one identifier a client can't otherwise withhold.
- **No session replay, ever.** Mobile replay records the screen, and this screen is full of the learner's own writing and their generated activities — exactly the content the rest of this document promises never leaves the device. `enableSessionReplay: false`, and the optional `posthog-react-native-session-replay` package is not installed, so the capability isn't in the binary. Aggregate ratings (below) and shared activity reports are how we see quality instead. Revisiting this would be a product decision recorded here first, not a config change.
- **Opt-in (D9)**: default **off** — nothing is transmitted until the user says yes. Consent is three-valued in `apps/mobile/src/analytics/consent.ts`: `undecided` (buffer), `granted`, `denied`, stored as `posthog_opt_in` + `posthog_consent_decided` in local settings. One-time ask after the first completed activity ("Share anonymous usage?" — one line on what it includes/excludes, links to privacy); toggle lives in Me → AI usage. Autocapture needs `<PostHogProvider>`, which the app never renders; lifecycle events, surveys and feature-flag preloading are off at construction.
- **Pre-consent buffer**: from first launch, the typed `track()` wrapper writes events to the local `analytics_buffer` table instead of PostHog. The cap is "the first week, or 300 events, whichever comes first", measured from the first buffered event: once the window closes the buffer keeps what it has and refuses more, because the early events are the ones worth keeping. On opt-in the buffer is flushed to PostHog with each event's original timestamp (so a willing user's first intake and first activity are captured, in order); on decline it's deleted and buffering stops. The buffer holds only schema-conformant events — same allowlist, no content — and never leaves the device without opt-in.
- Landing page: no cookies. Anonymous page views only, via Vercel Web Analytics (no custom events). Mounted in `apps/web/app/(site)/layout.tsx`, so API routes are excluded. Disclosed on `/privacy`.

## Event schema (allowlist — nothing else gets captured)

Never in any property: interest names, goal titles, activity titles, user text, URLs, email. Durations/latencies as buckets, not raw ms.

| event                                | properties                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app_opened`                         | platform, app_version, days_since_install (bucket)                                                                                                     |
| `intake_started`                     | is_first_interest                                                                                                                                      |
| `intake_step_completed`              | step (1–7), duration_bucket                                                                                                                            |
| `intake_completed`                   | topics_selected_count, frequency, session_minutes                                                                                                      |
| `intake_abandoned`                   | last_step                                                                                                                                              |
| `activity_started`                   | section, tier, library_item_id, source (card/prefetch/resume — `prefetch` is reserved; prefetching generates a document, it doesn't start an activity) |
| `activity_completed`                 | section, tier, library_item_id, duration_bucket, pages, questions_asked_count, rating                                                                  |
| `activity_abandoned`                 | tier, last_page_index                                                                                                                                  |
| `question_asked`                     | tier                                                                                                                                                   |
| `reflection_completed`               | changes_count                                                                                                                                          |
| `goal_added`                         | source (suggestion/reflection/user)                                                                                                                    |
| `resource_added`                     | source (user/suggested)                                                                                                                                |
| `routine_configured`                 | via (checkboxes/free_text)                                                                                                                             |
| `backup_enabled` / `backup_disabled` | —                                                                                                                                                      |
| `byok_enabled`                       | —                                                                                                                                                      |
| `ai_call`                            | kind, model, latency_bucket, status (ok/error/rate_limited)                                                                                            |
| `cap_reached`                        | —                                                                                                                                                      |
| `featurebase_opened`                 | screen                                                                                                                                                 |
| `email_feedback_sent`                | screen, included_context                                                                                                                               |
| `activity_report_sent`               | —                                                                                                                                                      |
| `settings_changed`                   | key (enum)                                                                                                                                             |

Implementation: the schema is a discriminated union in `packages/core/src/analytics/events.ts` — in core rather than the app so its buckets and allowlist are unit-testable — and `track()` in `apps/mobile/src/analytics/track.ts` is typed by it. Adding an event means editing the union, the runtime allowlist beside it (a type error if they disagree), and this table. No stray `posthog.capture` calls.

`sanitizeAnalyticsProperties` runs on every event, buffered or sent: properties the schema doesn't declare are dropped, and so is any value that isn't a string under 64 characters, a finite number, or a boolean — an object, an array or a long string is the shape a content leak takes. Buckets: `durationBucket` (`<10s` … `45m+`), `latencyBucket` (`<500ms` … `30s+`), `daysSinceInstallBucket` (`0`, `1-6`, `7-29`, `30-89`, `90+`).

Counts that are deliberately raw rather than bucketed: `pages`, `questions_asked_count`, `topics_selected_count`, `session_minutes`, `changes_count`, `last_page_index`, `step` — small integers about our own structures, not about the person.

## Activity quality review (D18)

We want to see whether generated activities are actually good without ambient content collection. Two layers:

1. **Aggregate signal** (PostHog, opt-in): `activity_completed` carries rating × library_item_id × tier — enough to spot "faded examples are rating poorly in language interests" without any content.
2. **Shared activity reports** (explicit, per-activity): the summary page's rating row has a note box and a **Send** button. Sending shares the generated activity content, the rating + note, and the library item/kind metadata through signed `POST /api/activity-report`, which forwards it by email and never stores it. The user's own responses are **never included** — the help text under Send says so. There is no opt-in to include them: one feedback path, one unconditional promise. Nothing is ever shared without this explicit action.

## What the server sees (and doesn't keep)

- **AI proxy**: receives `{kind, params}` (params include learning content by necessity, e.g. intake answers) and streams Anthropic's response through. It does **not** log prompt/response bodies — only per-kind aggregate counters (count, tokens, latency, errors) keyed by device_id for metering.
- **Featurebase portal**: receives community posts and the provider's normal technical request data. thinkering supplies only coarse screen, platform, and app version metadata — no app identity, email, SSO data, learning content, or analytics copy of the post.
- **Private feedback and activity-report routes**: forward content via Resend; neither content nor the optional reply email is stored or logged. Persistent per-device/day rate-limit counters contain no submitted content.
- **Supabase backup**: user-owned rows under RLS; deleted when backup is turned off or account deleted.
- **Metering tables**: device_id (random), daily token counts. No content, no identity linkage.

## App Store privacy disclosures

What App Privacy on App Store Connect should say, and why. **"Do you use data to track users?" — No**: nothing is shared with data brokers or used for cross-app advertising, and no identifier is linked to an identity.

| Data type                         | Collected | Linked to the user | Purpose           | Why                                                                                                 |
| --------------------------------- | --------- | ------------------ | ----------------- | --------------------------------------------------------------------------------------------------- |
| Contact info → Email address      | Yes       | **Yes**            | App functionality | Only if the user opts into backup (Supabase auth), or supplies a reply address on private feedback. |
| User content → Other user content | Yes       | Yes                | App functionality | Backup rows are the user's own learning data under RLS. Off by default.                             |
| User content → Other user content | Yes       | **No**             | App functionality | Prompt content through the AI proxy, and explicitly shared activity reports. Neither is stored.     |
| Identifiers → User ID             | No        | —                  | —                 | The analytics id is random, device-local and never linked; PostHog's `$ip` is suppressed.           |
| Usage data → Product interaction  | Yes       | **No**             | Analytics         | The docs/08 event schema, opt-in only. Declare it — "the user can turn it off" does not exempt it.  |
| Diagnostics                       | No        | —                  | —                 | No crash reporter, no performance SDK, no error tracking.                                           |

Also before submission:

- **The embedded Featurebase WebView** shows user-generated content from other people, so App Review Guideline 1.2 applies: the portal must have moderation, reporting, blocking and a contact path, and the checklist in `10-testing.md` §Tier 6 is the pre-TestFlight pass for it. If end-user reporting can't be provided, iOS opens the portal in the system browser instead of the WebView.
- **Account deletion** (Guideline 5.1.1(v)): because the app offers account creation, it must offer in-app deletion of the account itself — not only the sign-out and the backup off-switch that deletes the server copy. Built in WP9.3 as a signed `POST /api/account/delete`.
- **Encryption**: `ITSAppUsesNonExemptEncryption = false` — HTTPS only, no custom cryptography. (The device-signing HMAC is exempt as standard authentication.)

## Privacy page (landing `/privacy` + Me → Privacy)

Both surfaces render the same copy, which lives as data in `packages/core/src/privacy/copy.ts` — they drifted once, and sharing the text is cheaper than remembering to sync it. Still pending Reb's review of the wording. Must cover, in plain language: local-first storage; what LLM calls transmit and that we don't store them; optional backup and its deletion; anonymous opt-in analytics and exactly what's in it; the explicit share-an-activity option; BYO key handling; public/community feedback stored by Featurebase; private feedback and activity reports processed through Resend; the technical information each provider receives; retention and deletion handling; and contact `hello@thinkering.app`. Update App Store privacy disclosures for the embedded Featurebase WebView before release.
