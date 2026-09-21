# 01 — Product spec

Authoritative description of user-facing behavior. Vocabulary per `00-overview.md`. LLM call ids (G1, G2, …) are defined in `04-ai-pipeline.md`.

## 1. Intake flow

Runs for a brand-new user (after a brief welcome screen) and every time an existing user adds a new interest. One question per screen, progress dots, back navigation allowed. Answers are editable later in Path settings.

**Step 1 — What do you want to learn?**
Free text. Below the field, a few subtle example chips (rotate from a pool; show ~4, tappable to fill): _Understand LLMs and AI · Improve my approach to personal finance · Product management skills · More about climate and sustainability · Learn how to draw · Get back into Spanish · Get conversational in German · Improve my chess skills_.

**Step 2 — Why do you want to learn it?**
Single select: **For my career / For a personal goal / For fun**, plus an open free-text follow-up, marked optional: _"What do you want to be able to do, and why?"_ The field grows as they write.
→ On advance, fire **G1** (approach & pedagogy notes) in the background.

**Step 3 — How much experience do you have?**
Single select: **Just getting started / Explored a bit / In the middle / Have a lot of experience**, plus the same optional, growing follow-up: _"What have you tried before, and how did it go?"_
→ On advance, fire **G2** (topic candidates and what success could look like, in one call; waits on G1) in the background. It streams topics first, so step 4 doesn't wait on step 5's half.

**Step 4 — Which topics feel most relevant?**
Multi-select chips from G2's ~10 topics (mix of motivation-aligned, foundational/prerequisite, and adjacent-but-interesting; the mix is invisible to the user). A small field with a **+** above the chips adds their own topic, selected straight away. Selecting none is allowed. If G2 hasn't finished, a brief, branded generating state shows below the field.

**Step 5 — What are you hoping for?**
Multi-select chips from G2's 3–5 short, varied, first-person outcomes (_"I can follow a dinner conversation"_, _"I understand when to use du or Sie"_), with the same add-your-own field. Selecting none is allowed, and so is moving on if G2 failed. (The prompt still frames these as what success would feel like; the learner-facing question is softer on purpose.)
→ On advance, fire **G3** (initial path: short interest name + 5–8 sequenced goals, shaped by the topics and outcomes they picked).

**Step 6 — How much time do you want to spend?**
Two choices on one screen: frequency (**Daily / Several times a week / When I can**) and session length (**5 / 10 / 15 min / Custom**).
This screen buys time for G3, which is why it comes after topics and outcomes: G3 doesn't need the answer, and firing it earlier takes most of its wait off the last step.

**Step 7 — "Here's a direction we can start with."**
Show the generated interest name and the goal list (title + one-line description each), streaming in if G3 is still going. Single reassuring line: _"We'll keep evolving this as you go."_ Primary button starts the first activity or goes to Today.
→ On completion, fire **G4** (background web search for resources) and **G5-prefetch** (today's Next activity).

**Unfinished intake**: until the interest is saved, the answers, the step they're on and every generation that has come back are kept on the device as a draft (local settings, never synced — `03`). Leaving partway, closing the app or reloading the page loses nothing: the draft picks up at the step they left, with no generation made twice. There is one draft at a time. An existing user can leave from any step with the **×** beside the progress dots (back from step 1 does the same, returning them to the screen they started it from); once they've written what they want to learn, a sheet asks **Finish this later?** — **Save for later** or **Discard**, and closing the sheet stays put. A first interest has no ×: there is nothing to leave to. Back from step 1 goes to the welcome screen instead — including on a run picked up from a draft, which has no history behind it, so the first question is never a dead end. **Add an interest** with a draft waiting asks first, in a sheet showing what they wanted to learn: **Keep going** or **Start something new** (which drops the draft). A first-run user reopening the app goes straight back into it, and Manage Interests lists it under **Unfinished** (§7).

**Mode placement (D15)**: this step also shows, subtly, where the interest landed, together with the reassuring line above the name and goals, and a one-line hint for the current mode — **In focus** if frequency is daily/several-times-a-week or the why is career/personal-goal; **Exploring** for for-fun + when-I-can. One tap toggles it; changeable anytime in Manage Interests.

## 2. App shell

Four tabs: **Today, Path, History, Me**.

**Interest selector** (top toolbar on Today, Path, History): one pill per in-focus interest, plus an **Explore** pill when any exploring interests exist. Selecting Explore reveals a second pill row: **All** (default) + one pill per exploring interest. Path is the exception: it has no "All" — it defaults to the first interest. The row shows even with a single interest, because it also carries a **+** button — placed right after the last pill, or pinned to the right once the pills overflow — that starts intake for the next one (skipping the welcome screen, which is only for a brand-new user). On finishing, Today opens on the interest just added.

**Feedback button**: small, unobtrusive (e.g. a corner icon on every screen). Opens a compact chooser:

- **Post to a feedback board** — community feedback hosted by Featurebase; feature/general posts may be public. Native opens a dedicated portal WebView and Expo web opens the portal in a new tab. The portal exposes Feature requests, General feedback and discussions, and Bugs and issues, with loading, offline/retry, close/back handling, and external links handed to the system browser. Only coarse screen, platform, and app version metadata may be attached; never app identity, email, raw routes/URLs, activity IDs, hardware/device IDs, interests, goals, or learning content.
- **Send privately by email** — a native form with required feedback (maximum 4,000 characters), optional validated follow-up email (never persisted locally), and an **Include app details** toggle that defaults on. Its visible preview is limited to coarse screen, platform, and app version. Send uses the signed `POST /api/feedback` route; success closes the form and briefly confirms, while failure preserves the text for retry.

Keep `hello@thinkering.app` visible for questions or privacy concerns.

## 3. Today

Per selected interest (or aggregated across interests for Explore→All), three sections, each with a heading, a small configure (⚙) button, and swipeable cards. Cards show: activity title, the goal it targets, and a time estimate — or **Writing** while the activity is being generated and has no page to read yet. Once page 1 of the stream lands the card goes back to its time estimate: from there it opens onto something readable and the rest streams in behind it. (A card still saying **Writing** can be opened too; it opens onto the wait.) At the bottom, a subtle centered **"Configure learning routine"** button.

Each section offers **one open card at a time**. When the learner finishes it, that section gets its next card straight away, picked by the same rules and skipping goals the section has already had today — so finishing Next moves on to the next unstarted goal. A new day clears the finished cards; unfinished ones stay, and on opening Today only the sections left with nothing open get a new card — so nothing is generated until it's needed. **Explore → All** suggests rather than prepares: it shows cards from at most **2** of the exploring interests — never-practiced first, then least recently practiced (judged on days before today, so the pair holds for the day and rotates across days). Their cards get titles (G5a) but no content: each says **Write**, and tapping it writes that one in place (then **Writing**, then its time; a tap then opens it). Selecting a single interest is what fills its missing sections and writes its cards ahead. A card whose background write failed also shows **Write**.

### Card selection rules (deterministic — `packages/core/scheduler`)

- **Next** (1 card): an _introduce_-tier activity for the first `not_started` goal in the path. If ≤ 3 `not_started` goals remain, additionally show a card that opens the **Reflection** experience.
- **Strengthen** (1 card): _strengthen_-tier activities. Goal choice priority: (1) `introduced` but not yet `strengthened`; (2) already `strengthened` (spaced review — prefer least-recently-strengthened); (3) a prerequisite topic to their goals (early-days fallback).
- **Go further** (1 card): _apply_-tier activities (both flavors: apply and extend — see `06`). Priority: (1) `strengthened` but not yet `applied`; (2) already `applied`; (3) merely `introduced` (or the first goal for brand-new users). Once every goal is excluded for the day the section rests until tomorrow.

Card metadata (title, estimate, library item) comes from the cheap daily-plan call **G5a** when a section needs a card; full activity content (**G5b**) is written ahead in the background, one card at a time with Next first, so a new interest has all three ready shortly after intake. Opening a card that's still being written joins that stream.

### Adding an activity (+)

Each section's row ends in a **+** card (single interest in view). It opens a sheet, **"Create a new [section] activity"**, with the interest's goals as optional chips (for Next, only goals not yet started) and one optional field — _"Anything to focus on, or how you'd like to learn it"_. Create plans one card in that section through G5a (the request shapes the item and title) and writes it straight away through G5b (the request is passed along). With a goal chosen, the card targets that goal and completes at the section's tier as usual. With only a focus, the card has no goal — its topic is a short name for the request and it moves no goal status. With neither, it lands on the section's own next pick. While G5a runs, a placeholder card shows **Writing** in that section.

### Completion states

When the user completes an activity in a section, that section's heading gets a sun-yellow check and a small count ("2 today"), and the finished card takes the section's tint with a yellow "Done today" chip. What's done is what shows; there's no separate "done for the day" state. The intended rhythm: each day, in an interest, do at least one Next and one Strengthen; Go further when it suits. Remaining cards stay available — completion celebrates, it doesn't lock.

### Configure (⚙ per section)

Sheet with one line on what the section is for, then that section's library items as a two-column grid of small cards with checkboxes (active/inactive for this user + interest + section). Tapping a card opens a short overview dialog of the strategy. At least one item must remain active per section.

### Configure learning routine (bottom button)

Sheet opening with a line that the daily counts aren't configurable yet, linking to the "customize learning routine" post on the feedback board. Below it, the routine — **Next** (1 a day), **Strengthen** (optional), **Go further** (optional), each with a one-line description — then a single free-text question: **"What would you like more or less of?"** → **G11** interprets it into library activations/preference notes and confirms the change in one line.

## 4. Activities

Multi-page, rendered from an Activity Document (`05-activity-format.md`). Top progress bar segmented by page; forward/back navigation always available. Every page has interactive elements per its library item.

- **Response review page** (reserved near the end, counted in the page total): while the user works, **G6** analyzes their responses and fills this page with the highest-value response — addressing a misconception, deepening a good answer, or answering an implicit question.
- **Summary page** (last): a short celebration line, the concept recap, concept/skill chips for what was introduced/strengthened/put to use, and at the foot of the page a usefulness rating (👎 / 👍👎 mixed / 👍), an optional note, and a Send button that shares the activity, rating and note with the developers — not the learner's answers (explicit, per-activity — see `08`, D18).
- **Ask button** (always visible): free-text question → **G7** inserts a new page immediately after the current one and jumps to it, answering the question, with an interaction included when asked for or clearly valuable. Inserted pages extend the progress bar.
- Completing the activity advances the goal's status (introduce → `introduced`, etc.), records history, and updates section completion state.
- Leaving mid-activity keeps it resumable from Today for the rest of the day; unfinished activities don't advance goal status.

## 5. Path

For the selected single interest:

- **Goal list**, in path order. Status shown by color treatment, not pills: `not_started` = plain white card, `introduced` = light cornflower wash, `strengthened` = solid cornflower (light text), `applied` ("Put to use") = a distinct warm celebratory treatment (peach edge/glow — a delighter, since going further is optional). Long-press a goal to turn on reorder mode — each card grows up/down controls and the header a Done button (a drag gesture was not worth a reanimated gesture handler for a 5–8 item list). Tap a goal to expand it; the pencil opens its title/description for editing, or removes it. **Add a goal** under the list opens the same sheet empty: a title and optional description, added at the end of the path. It has no concepts until one is generated for it (a later option), so it shows no coverage when expanded.
- **Expandable goals (D16)**: tapping a goal expands it to show the concepts and skills beneath it, with subtle coverage indicators for those already targeted by completed activities. Activities highlight these same concept/skill labels (summary chips, in-page emphasis) so the user can see what they're building.
- **Reflection card** ("Reflect on progress and update path"): opens the Reflection flow, three steps with progress dots. **G8a** goes out as it opens and gates nothing — its parts appear when ready, and are simply absent if it fails. (1) **"Is this still what you're hoping for?"** — their saved outcomes as selected chips, the same add-your-own field as intake, and 2–3 more outcomes from G8a, unselected. Deselecting one means it no longer applies. (2) G8a's 1–2 sentence recap of what and how they've been learning lately, a collapsed **Your path** (the Path goal cards, read-only) and the question on how their learning feels and what they want to focus on next (free text). (3) Their current goal list with the ability to remove/reorder, a field to add their own goal, and **G8**-generated suggestions based on the reflection, the outcomes from step 1, their interests and adjacent topics. Nothing is written until **Update path**, which saves the path and the outcomes together (dropped outcomes leave the interest; the reflection records before and after).
- **3 suggested goals** always at the bottom (from **G9**, cached, regenerated when the path changes) — one tap to add.

### Resources (book icon on Path)

List of resources for the interest. Each has: title, link, short description, "how this could be used" (user-entered, or generated if blank, or empty), and a longer summary stored for generation purposes but not shown.

- **Add by link**: paste URL → the proxy fetches the page and **G10** drafts title/description/how-to-use/summary; user can edit before saving. In fixture AI mode the fetch is served from a canned page, so the flow runs offline.
- **Initial seeding**: after intake, **G4** web-searches for reputable, goal-specific YouTube videos and articles and saves them (marked as app-suggested; user can delete).
- Resources are considered by activity generation (follow-along worked examples, things to study/notice, material for In-the-Wild activities).

### Path settings (⚙ icon on Path)

Reached from the ⚙ in the Path header. Text fields and outcomes commit with **Save**; the lists (topics, contexts) act as they are tapped. Editable fields, all from intake: short interest name · what they want to learn · why (selection) · why (text) · experience (selection) · experience (text) · what they're hoping for (outcomes; add/edit/remove) · frequency · session length · topics of interest (add/delete; considered when suggesting goals) · approach notes (from G1, editable) · **Contexts**: projects, environments, and people related to this interest (add/edit/delete) — considered when generating Go further activities, included only when they genuinely add value.

## 6. History

For the selected focused interest, all-explore, or an individual explore interest: completed activities grouped by date, newest day first. Each row: activity title + outcome line — _Introduced [goal] / Strengthened [goal]_, or for Go further the library item's `outcomeLabel`: _Put to use [goal]_ (apply items), _Went deeper on [goal]_ / _Branched out from [goal]_ (extend items). Load ~5 most recent active days, infinite scroll for more.

## 7. Me

- **Manage Interests** (top): reorder interests; set each to **In focus / Exploring / Archived**; unarchive freely. A **+** in the header starts intake for a new one, the same as the selector's. An unfinished intake (§1) sits above them under **Unfinished**: tap to keep going, or discard it after a confirm.
- **Calendar**: current month, days with completed activities highlighted; tapping a day lists that day's activities chronologically, grouped by interest. Swipe/navigate to load other months.
- **Settings**: reached from the **⚙** in the header — an index of categories, each its own pushed screen. Nothing on the tab itself is a setting, so Me stays the interests and the calendar. The same ⚙ sits in the top-right of Today, Path and History too, so settings are one tap away from wherever you are; on Path it follows that tab's own resources and per-interest settings icons.
  - **Account and data** — default off. Three things that share one question, _what leaves this device_: a **file you keep** (export to a versioned JSON file through the share sheet; import replaces everything on the device after a confirm); **synced backup** — create/sign in to a Supabase email/password account, change password, sign out, delete the account, toggle sync, back up now (turning the toggle off deletes the server-side copy after confirmation; local data is untouched), with the sync half hiding itself in a build with no Supabase project configured; the **PostHog toggle** ("Share anonymous usage to improve thinkering" — opt-in, default off, not linked to identity); and, under its own heading, **Session replays** ("Share session replays with developers" — opt-in, default off, separate from the usage toggle, with one line saying recordings show your activities and what you type, D22). The one-time sharing ask is a card at the top of the intake welcome screen, clear of **Get started**, in two steps marked by two dots: anonymous usage first, then session replays. Each step has two buttons, one line about what it does and doesn't include, a note that it can be changed later in Me → Settings, and a link to Privacy. Usage makes **Share** the primary button; replays weigh **Share** and **No thanks** the same, so no one is nudged into being recorded. It doesn't block: someone can start intake without answering, and each step stays undecided until it's answered or its toggle is used. Once answered it never appears again, and it doesn't appear at all in a build with no PostHog key. The way back in also sits on the intake welcome screen, quietly: a fresh install is when you need it most and is the one moment Me isn't reachable. **I already have an account or a backup file** opens **Welcome back** with two choices: **Sign in to your account**, which turns backup on and waits for the first sync, then opens Today, or goes on into intake when the account has nothing yet; and **Restore from a backup file**, which needs no confirm because there's nothing on the device yet. A keychain that outlived a reinstall may still hold a session, so sign-in offers **Continue** as that account, or **Use a different account**. Creating an account stays in Me → Account: one is worth making once there's something to keep. A build with no Supabase project keeps the old **Restore from a backup** link, which goes straight to the file. Last on the screen, under a rule, **Delete all data**: it confirms first — what goes, and that it can't be undone — then deletes the learner's data from this device and, when an account is signed in, the copy on the server with it, so nothing comes back on the next sync, and reopens the app at the intake welcome. The account itself stays; deleting that is Me → Account.
  - **AI** — today's usage vs. the daily included cap (meter), with a line under it saying the limit is there to keep costs sustainable and pointing at `hello@thinkering.app` for anyone running into it often or needing more; **Have a code?**, which redeems a code we hand out for a bigger daily allowance (`04` §Usage metering — one device, once, and the meter simply reads against a higher limit afterwards, with no arithmetic on the client); and the option to add their own Anthropic API key (stored in SecureStore/Keychain; unmetered, calls go direct), which is native only, the web app having no keychain. The code field is hidden when a BYO key or fixture mode is in use: there is no meter to raise.
  - **Privacy** — the landing page's `/privacy` copy, rendered from the same source in `packages/core` so the two can't drift.
  - **Feedback** — the same community/private chooser as the global feedback button, but pushed like everything else under the ⚙ rather than raised as a sheet, with `hello@thinkering.app` visible for questions or privacy concerns. Both entry points are built from one hook so the two channels can't drift apart.
  - **About** — an early-stage project, actively in development, built by Rebecca Hao with the support of Assembly Code; an invitation to be in touch about the user's experience with thinkering, personal learning, the science of learning, and AI, with `hello@thinkering.app`. The version line lives here, and is also the hidden long-press (`02`) that reveals **Developer**.
  - **Developer** — absent unless the Inspector is enabled: always in a dev build, and in production only after the long-press on About. Holds the **AI Inspector**, plus — dev builds only — the **AI mode** switch (proxy · byok · fixture) and fixture-data seeding. Switching mode changes only which way the _next_ generation is made; it never touches what is already stored, and because the choice is a local setting it outlives any change to `EXPO_PUBLIC_AI_MODE`, which is only the default before one is chosen.

## 8. Landing page (`apps/web`)

Small marketing site at thinkering.app, designed per `07-design-system.md` (same tokens/fonts as the app; landing-only display sizes live in `apps/web/tailwind.config.cjs`). Pages, under a shared header (overview with hover section-jump, about, contribute, contact, join-the-beta CTA) and dark footer:

- **`/` overview** — hero (promise + "grow as a learner" beat, join-the-beta CTA), how it works (add an interest → path → daily activities → routine, with a typed-interests mock and a switchable 3-interest sample path), why it works, principles (dark section, 4 cards), the project (Reb/Assembly Code card).
- **`/about`** — the project's goal + the five principles, full versions.
- **`/contribute`** — three tinted cards: library discussion thread, beta + feedback/roadmap, GitHub.
- **`/contact`** — a message form (name, email, message) posting to `POST /api/contact`, plus email + LinkedIn.
- **`/privacy`** — plain-language policy per `08`.

The primary CTA is the beta signup form (Google Form) until an App Store link exists. Feedback/roadmap links go to the Featurebase portal. `hello@thinkering.app` is assembled client-side so it never appears in served HTML. All external URLs live in `apps/web/components/links.ts`. Also hosts the API routes.

## 9. Later (explicitly out of v1 scope)

- iOS Share Extension: share a link from any app into thinkering → becomes a resource (and can seed activities).
- Android polish pass, push/local reminders aligned to their chosen frequency, App Attest hardening, widgets.
