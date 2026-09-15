# 08 — Analytics & privacy

## Stance

Learning data is personal. It lives on the device; the only ways it leaves are the LLM proxy (to generate content — not stored server-side), opt-in Supabase backup, community or private feedback the user deliberately submits, and explicit activity reports. Telemetry must be useful for product decisions while never containing learning or feedback content or identity.

## PostHog setup

- `posthog-react-native`, EU or US host (pick one, document in privacy copy).
- **Identity**: a locally generated random UUID as `distinct_id`. Never call `identify()` with email/user id — even when the user creates a Supabase backup account, telemetry stays unlinked (D9).
- **Opt-in (D9)**: default **off** — nothing is transmitted until the user says yes. The setting itself is `posthog_opt_in` in local settings, read through `apps/mobile/src/analytics/consent.ts` (built in WP6.2, ahead of the wrapper). One-time ask after the first completed activity ("Share anonymous usage to improve thinkering?" — one line on what it includes/excludes, links to privacy); toggle lives in Me → AI usage. Session replay, autocapture, and GeoIP enrichment disabled.
- **Pre-consent buffer**: from first launch, the typed `track()` wrapper writes events to a local buffer table instead of PostHog (capped: first ~7 days / ~300 events). On opt-in, the buffer is flushed to PostHog (so a willing user's first intake and first activity are captured); on decline, it's deleted and buffering stops. The buffer holds only schema-conformant events — same allowlist, no content — and never leaves the device without opt-in.
- Landing page: no cookies/analytics beyond privacy-respecting basics (at most PostHog with the same rules, or nothing).

## Event schema (allowlist — nothing else gets captured)

Never in any property: interest names, goal titles, activity titles, user text, URLs, email. Durations/latencies as buckets, not raw ms.

| event                                | properties                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `app_opened`                         | platform, app_version, days_since_install (bucket)                                    |
| `intake_started`                     | is_first_interest                                                                     |
| `intake_step_completed`              | step (1–6), duration_bucket                                                           |
| `intake_completed`                   | topics_selected_count, frequency, session_minutes                                     |
| `intake_abandoned`                   | last_step                                                                             |
| `activity_started`                   | section, tier, library_item_id, source (card/prefetch/resume)                         |
| `activity_completed`                 | section, tier, library_item_id, duration_bucket, pages, questions_asked_count, rating |
| `activity_abandoned`                 | tier, last_page_index                                                                 |
| `question_asked`                     | tier                                                                                  |
| `reflection_completed`               | changes_count                                                                         |
| `goal_added`                         | source (suggestion/reflection/user)                                                   |
| `resource_added`                     | source (user/suggested)                                                               |
| `routine_configured`                 | via (checkboxes/free_text)                                                            |
| `backup_enabled` / `backup_disabled` | —                                                                                     |
| `byok_enabled`                       | —                                                                                     |
| `ai_call`                            | kind, model, latency_bucket, status (ok/error/rate_limited)                           |
| `cap_reached`                        | —                                                                                     |
| `featurebase_opened`                 | screen                                                                                |
| `email_feedback_sent`                | screen, included_context                                                              |
| `activity_report_sent`               | —                                                                                     |
| `settings_changed`                   | key (enum)                                                                            |

Implementation: one typed `track()` wrapper in `apps/mobile/src/analytics` whose union type _is_ this schema — adding an event means editing the type + this doc. No stray `posthog.capture` calls.

## Activity quality review (D18)

We want to see whether generated activities are actually good without ambient content collection. Two layers:

1. **Aggregate signal** (PostHog, opt-in): `activity_completed` carries rating × library_item_id × tier × model — enough to spot "faded examples are rating poorly in language interests" without any content.
2. **Shared activity reports** (explicit, per-activity): the summary page offers "Share this activity with the developers". Sharing sends the generated activity content, the rating + comment, and the library item/kind metadata through signed `POST /api/activity-report`, which forwards it by email and never stores it. The user's own responses are **excluded by default**, with a checkbox to include them — and when included they travel as plain question/answer lines, not raw payloads. Nothing is ever shared without this explicit action.

## What the server sees (and doesn't keep)

- **AI proxy**: receives `{kind, params}` (params include learning content by necessity, e.g. intake answers) and streams Anthropic's response through. It does **not** log prompt/response bodies — only per-kind aggregate counters (count, tokens, latency, errors) keyed by device_id for metering.
- **Featurebase portal**: receives community posts and the provider's normal technical request data. thinkering supplies only coarse screen, platform, and app version metadata — no app identity, email, SSO data, learning content, or analytics copy of the post.
- **Private feedback and activity-report routes**: forward content via Resend; neither content nor the optional reply email is stored or logged. Persistent per-device/day rate-limit counters contain no submitted content.
- **Supabase backup**: user-owned rows under RLS; deleted when backup is turned off or account deleted.
- **Metering tables**: device_id (random), daily token counts. No content, no identity linkage.

## Privacy page (landing `/privacy` + Me → Privacy)

Placeholder for Reb's copy. Must cover, in plain language: local-first storage; what LLM calls transmit and that we don't store them; optional backup and its deletion; anonymous opt-in analytics and exactly what's in it; the explicit share-an-activity option; BYO key handling; public/community feedback stored by Featurebase; private feedback and activity reports processed through Resend; the technical information each provider receives; retention and deletion handling; and contact `hello@thinkering.app`. Update App Store privacy disclosures for the embedded Featurebase WebView before release.
