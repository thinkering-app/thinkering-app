# 01 — Product spec

Authoritative description of user-facing behavior. Vocabulary per `00-overview.md`. LLM call ids (G1, G2, …) are defined in `04-ai-pipeline.md`.

## 1. Intake flow

Runs for a new user (after a welcome screen) and whenever an interest is added. One question per screen; answers stay editable in Path settings.

1. **What's one thing you want to learn?** Free text, with a few tappable example chips. It becomes one interest with one path, so it asks for one thing; on a first interest, a line under the field says **You can add more later.**
2. **Why?** **For my career / For a personal goal / For fun**, plus an optional follow-up.
3. **How much experience?** **Just getting started / Explored a bit / In the middle / Have a lot of experience**, plus an optional follow-up. → On advance, fire **G1** (approach), **G2** (outcomes) and **G2b** (topics) together; none waits on another. Step 4 waits only on G2, and is the time G2b has to finish; G1 has until G3 needs it.
4. **What are you hoping for?** Multi-select from G2's 3–5 first-person outcomes, plus add-your-own. None is allowed.
5. **Which topics feel most relevant?** Multi-select from G2b's ~10 topics, named for their experience — everyday words for a newcomer, the field's terms for someone experienced — plus add-your-own. None is allowed, as is moving on if G2b failed. → On advance, fire **G3** (interest name + 5–8 sequenced goals).
6. **How much time?** Frequency (**Daily / Several times a week / When I can**), session length (**5 / 10 / 15 min / Custom**) and reading per page (**Short / Medium / Long**, starting on Medium). Session length sets an activity's pages; reading sets how much prose is on each.
7. **Here's a direction we can start with.** The interest name and goals, streaming if G3 is still going. → On completion, fire **G4** (resource search) and **G5-prefetch** (today's Next).

**Mode placement (D15)**: step 7 shows where the interest landed — **In focus** if frequency is daily or several times a week, or the why is career or personal goal; **Exploring** for for-fun + when-I-can. One tap toggles it.

**Unfinished intake**:

- Until the interest is saved, answers, step and returned generations are kept as a local draft (never synced — `03`). Leaving or reloading loses nothing: it resumes at the same step, and no generation is made twice. One draft at a time.
- An existing user leaves with the **×** beside the dots, or back from step 1 (returning where they started). Once step 1 has an answer, a sheet asks **Finish this later?** — **Save for later** or **Discard**; closing it stays put.
- A first interest has no ×; back from step 1 goes to the welcome screen, even on a resumed draft, so the first question is never a dead end.
- **Add an interest** with a draft waiting asks **Keep going** or **Start something new** (dropping the draft).
- A first-run user reopening the app goes straight back into the draft. Manage Interests lists it under **Unfinished** (§7).

## 2. App shell

Four tabs: **Today, Path, History, Me**.

**Interest selector** (Today, Path, History): one pill per in-focus interest, plus **Explore** when exploring interests exist, which reveals **All** (default) + one per exploring interest. Path has no "All"; it defaults to the first interest. The row always shows, since it carries the **+** that starts intake (skipping the welcome screen); Today then opens on the new interest.

**Feedback button** (every screen) opens a chooser:

- **Post to a feedback board** — the Featurebase portal; posts may be public. Only coarse screen, platform and app version may be attached — never app identity, email, raw routes or URLs, activity IDs, device IDs, interests, goals or learning content.
- **Send privately by email** — required feedback (max 4,000 characters), an optional follow-up email (never stored locally) and **Include app details** (default on; coarse screen, platform and app version only). Sends via signed `POST /api/feedback`; failure keeps the text.

`hello@thinkering.app` stays visible for questions or privacy concerns.

## 3. Today

Per selected interest (or aggregated for Explore → All): **Next**, **Strengthen** and **Go further**, each with a ⚙ and swipeable cards. A card shows title, goal and time estimate, or **Preparing** until page 1 has streamed in (it can still be opened).

Each section has **one open card at a time**. Finishing it brings the next straight away, skipping goals the section already had today. A new day clears finished cards; unfinished ones stay, and only empty sections get a new card. Nothing is generated until needed.

Below the sections, an outlined **Configure learning routine** button (one interest in view), then a caption once there are cards: "Written by AI, which can get things wrong."

**Explore → All** suggests rather than prepares: cards from at most **2** exploring interests — never-practiced first, then least recently practiced (judged on days before today, so the pair holds for the day). They get titles (G5a) but no content; each says **Prepare**, and tapping writes it in place. Selecting a single interest fills its sections and writes ahead. A failed background write also shows **Prepare**.

### Card selection rules (deterministic — `packages/core/scheduler`)

- **Next** (1 card): an _introduce_-tier activity for the first `not_started` goal in the path. If ≤ 3 `not_started` goals remain, additionally show a card that opens the **Reflection** experience.
- **Strengthen** (1 card): _strengthen_-tier activities. Goal choice priority: (1) `introduced` but not yet `strengthened`; (2) already `strengthened` (spaced review — prefer least-recently-strengthened); (3) a prerequisite topic to their goals (early-days fallback).
- **Go further** (1 card): _apply_-tier activities (both flavors: apply and extend — see `06`). Priority: (1) `strengthened` but not yet `applied`; (2) already `applied`; (3) merely `introduced` (or the first goal for brand-new users). Once every goal is excluded for the day the section rests until tomorrow.

Card metadata (title, estimate, library item) comes from the cheap **G5a** when a section needs a card. Content (**G5b**) is written ahead in the background, one card at a time, Next first. Opening a card still being written joins that stream.

### Adding an activity (+)

With one interest in view, each section ends in a **+** card: optional goal chips, collapsed until opened (for Next, only unstarted goals); for Next and Strengthen, an optional activity type, collapsed the same way, listing the section's active library items each with an ⓘ (a section down to one type shows it, already chosen); and an optional focus field. Choosing a type built around a saved resource (Watch Along, Guided Reading) lists the saved resources of its media — the goal's first, then general ones, then other goals' — under an **Add a video** / **Add a reading** row that opens the add-link sheet (§5) and selects what it saves; a link of the other media is turned away. Create waits until a resource is chosen, and, when every type on the list is built around one, until a type is. Create plans the card through G5a and writes it through G5b, both given the request; a placeholder shows **Preparing** meanwhile.

- With a goal: targets it and completes at the section's tier.
- With only a focus: no goal — its topic names the request, and it moves no goal status.
- With neither: the section's own next pick.

### Completion states

Completing an activity marks the section heading with a check and count ("2 today") and the card with "Done today". Remaining cards stay available — completion celebrates, it doesn't lock.

### Weekly rhythm

With one interest in view, dots beside the **Today** title show its week (Monday to Sunday): one per day of its weekly target — chosen in **Configure learning routine**, or until then set by its frequency: **5** for daily, **3** for several times a week — filled for each day with a completed activity in that interest, light for the rest; once today counts, the last filled dot carries a check, like a section's. Days past the target add filled dots; "when I can" (or **No target**) has none, so only filled dots show, and none until the first day. The dots aren't weekdays, so there's no wrong day to miss. Tapping them says what they mean in a toast — the count ("2 of 5 days this week.") and a short line for where the week stands: not started, under way, target met, past it, or no target. The line is picked from a fixed list (`today/week-copy.ts`), stable for the day. Explore → All has none.

### Configure (⚙ per section)

**Activity settings: <section>**. Lists the section's library items for this user + interest + section, each with an ⓘ (what it is and why it helps) and an on/off switch. At least one must stay active. Mixed Review and Connect Ideas stay off, their switches disabled, until two goals are started (`06`).

### Configure learning routine

Notes that daily counts aren't configurable yet (linking to the feedback board post), shows the routine, then **Days to aim for** — chips 1–7 and **No target**, saved as tapped, moving only the week dots — and asks **"What would you like more or less of?"** → **G11** turns the answer into library activations and preference notes and confirms in one line.

## 4. Activities

Multi-page, rendered from an Activity Document (`05`); forward and back are always available.

- **Response review page** (near the end): **G6** analyzes responses as the user works and fills it with the highest-value response — a misconception, a good answer deepened, or an implicit question answered.
- **Summary page** (last): concept recap, chips for what was introduced, strengthened or put to use, the activity type with an ⓘ (the library item it was made from), and a rating (👎 / mixed / 👍) with optional note and **Send**, which shares the activity, rating and note — not the learner's answers — with the developers (`08`, D18).
- **Ask** (always visible): **G7** inserts a page answering the question right after the current one and jumps to it.
- Completing advances the goal's status, records history and updates section completion. An unfinished activity stays resumable from Today for the day and advances nothing.

## 5. Path

For one selected interest:

- **Goal list** in path order. Status is a color treatment, not pills (`07`). Long-press to reorder; tap to expand; the pencil edits or removes. **Add a goal** appends a title and optional description, with no concepts.
- **Expandable goals (D16)**: an expanded goal shows its concepts and skills, marking those covered by completed activities.
- **Reflection** (the **Check in** card): two steps. **G8a** fires on open and gates nothing; its recap appears when ready, or not at all if it fails.
  1. G8a's short recap, a read-only **Your path**, and one free-text field: how it's going, or a list of what they want to cover or learn next.
  2. The goals to remove or reorder, add-your-own, and **G8** suggestions from the reflection, outcomes and adjacent topics. Anything they listed that the path doesn't cover becomes a suggested goal. A proposed move says which way and after which goal, and a suggested goal where it would go; a move that would leave a goal in place isn't shown.

  Nothing is written until **Update path**; the reflection records the changes. What they're hoping for is edited in Path settings.

- **Progress**: under **Add a goal**, two caption lines — how many goals have reached at least each status ("8 introduced · 5 strengthened · 2 put to use", a status at zero left out) and the interest's completed activities ("23 activities completed"). No totals, so adding a goal never reads as ground lost. Hidden until the first completed activity.
- **3 suggested goals** below the path (**G9**, cached, regenerated when the path changes), collapsed to their titles — tap to read one — and one tap to add. The way into a reflection sits above them.
- The same AI caption as Today closes the page.

### Resources

Title, link, description, "how this could be used" (user-entered, generated if blank, or empty) and a hidden summary used for generation. Activity generation draws on them.

- **Add by link**: the proxy fetches the page and **G10** drafts the fields for the user to edit. Fixture mode serves a canned page.
- **Initial seeding**: after intake, **G4** finds goal-specific videos and articles, marked app-suggested and deletable.

### Path settings

Opened, like **Resources**, from the icons beside the ⚙ on Today, Path and History when one interest is selected. Every intake answer, editable, plus topics (considered when suggesting goals), approach notes (from G1), and **Contexts** — projects, environments and people, used in Go further activities only when they genuinely help. Text and outcomes commit with **Save**; lists act as tapped.

## 6. History

For the selected interest, Explore → All, or one exploring interest: completed activities by date, newest first. Each row: title + outcome — _Introduced [goal]_, _Strengthened [goal]_, or for Go further the library item's `outcomeLabel` (_Put to use_, _Went deeper on_, _Branched out from_). Loads ~5 active days, then scrolls for more.

## 7. Me

- **Manage Interests**: reorder, set **In focus / Exploring / Archived**, unarchive, **+** to add. An unfinished intake (§1) sits above under **Unfinished**: continue, or discard after a confirm.
- **Calendar**: active days highlighted; tapping one lists its activities by interest. Under the month, from two weeks up: **"N weeks in a row"** — weeks with an activity in any interest. The current week only adds once it has one and never breaks the run while it's under way; a broken run simply disappears.
- **Settings**: the **⚙** on Me, Today, Path and History opens an index of screens.

**Account and data** — what leaves this device:

- **Backup file**: export versioned JSON through the share sheet. Import replaces everything after a confirm.
- **Synced backup** (off by default): Supabase email/password account — create, sign in, change password, sign out, delete, toggle sync, back up now. Turning sync off deletes the server copy after a confirm; local data stays. Hidden without a Supabase project.
- **Anonymous usage**: on by default, not linked to identity (D9), not asked — the Privacy page describes it.
- **Session replays**: opt-in, off by default, separate from usage (D22). Asked once, in a card on the intake welcome screen clear of **Get started**, with **Share** and **No thanks** weighted equally. Doesn't block intake; undecided until answered or toggled. Absent without a PostHog key.
- **Getting back in**: on the welcome screen, **I already have an account or a backup file**. **Sign in** turns backup on, waits for the first sync, then opens Today (or intake if the account is empty); a session surviving reinstall offers **Continue** or **Use a different account**. **Restore from a backup file** needs no confirm. Without Supabase, only the file restore shows.
- **Delete all data**: confirms, then deletes the learner's data on the device and, when signed in, on the server, then reopens at the welcome screen. It keeps a "no" to anonymous usage, and keeps the account (deleted in Me → Account).

**AI**:

- A short note that the path and activities are written by AI, can get facts wrong or explain things poorly, and that the feedback button is the place to say so.
- A meter of today's usage against the daily cap, pointing to `hello@thinkering.app` for more.
- **Have a code?** raises the allowance (`04` §Usage metering — one device, once). Hidden with a BYO key or in fixture mode.
- A BYO Anthropic key (SecureStore; unmetered, calls go direct). Native only.

**Other settings**:

- **Privacy** — the landing page's `/privacy` copy, from the same source in `packages/core`.
- **Feedback** — the same two channels as the global button, from one shared hook.
- **About** — who makes thinkering and how to reach us. Long-pressing the version line (`02`) reveals **Developer**.
- **Developer** — absent unless the Inspector is enabled: always in a dev build, in production only after the long-press. Holds the **AI Inspector**, plus — dev builds only — the **AI mode** switch (proxy · byok · fixture) and fixture seeding. Switching affects only the _next_ generation, never what's stored. The choice is a local setting that outlives `EXPO_PUBLIC_AI_MODE`, which is only the default.

## 8. Landing page (`apps/web`)

Marketing site at thinkering.app, per `07`: `/`, `/approach` (the learning science and the learner's control; its activity lists read from `packages/core`), `/about`, `/contribute`, `/contact` (posts to `POST /api/contact`) and `/privacy` (per `08`).

- The primary CTA is beta signup until an App Store link exists.
- `hello@thinkering.app` is assembled client-side, never in served HTML.
- External URLs live in `apps/web/components/links.ts`.
- It also hosts the API routes.
