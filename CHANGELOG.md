# Changelog

User-visible changes, newest first. One entry per TestFlight or App Store
build; internal refactors and docs don't appear here. The conventions are in
[RELEASING.md](RELEASING.md).

## Unreleased

### Added

- Anonymous, opt-in usage analytics — off until you say yes, asked once on the
  welcome screen, and never carrying anything you write.
- Share session replays with the developers, if you choose — a separate
  setting in Account and data, off unless you turn it on.
- Delete your backup account from inside the app.
- A privacy page in the app that matches the one on the website.
- A new intake step, "What are you hoping for?", with suggestions to pick
  from. Your path is shaped around what you choose.
- Add your own topics and outcomes during intake.
- Add a goal of your own straight from Path.
- A + at the end of each Today section adds another activity. Pick a goal or
  say what you'd like to focus on, or leave both and get the next one.
- Edit, add or remove what you're hoping for in Path settings.
- Reflecting now starts with what you're hoping for — keep, drop or add to
  it, with a few new suggestions — then a short recap of your recent learning
  and a look at your path before you say how it's going.
- Leave intake from any step, and choose to save it for later or discard it.
  A saved one picks up where you left off, from Me → Interests or the next
  time you add an interest.

### Changed

- Configure learning routine shows your daily routine above the question,
  with a link to the feedback board if you'd like a different number of
  activities each day.
- A section's configure sheet says what the section is for, and shows its
  activity types as small cards, two to a row. Tap one to see what you'll do
  and why it helps, in plain words.
- The web app no longer takes your own Anthropic key, since a browser can't
  store it securely. A key saved there before is deleted; the phone app still
  offers it.
- On Today, what you've done stands out: a finished card takes its section's
  colour with a yellow "Done today", and the section gets a check by its name
  that pops in when you come back from the activity.
- The end of an activity opens with a short celebration and names the goal you
  worked on, with a little motion that differs by section (off when Reduce
  Motion is on). The rating sits at the bottom of the page; add a note and send
  it to us in one step. Your answers are never included.
- A new app icon, paper texture throughout, and watercolor washes behind the
  quieter screens.
- Intake asks what you want to be able to do and what you've tried before,
  with room to write as much as you like.
- Topics come before the time question during intake, so your path is usually
  ready by the time you reach it.
- The last intake step leads with In focus or Exploring, and says what each
  one is for.
- Today shows one card per section. Finish one and the next is ready in its
  place, and all three are written ahead so they open straight away. A card
  still being written says so. Unfinished cards stay until you get to them.
- Explore → All suggests activities from two of your exploring interests at a
  time, rotating day to day. Tap Write on one to have it written.
- Opening an activity shows what's happening while it's written — planning,
  then writing, then which page is next — and you can close it while you wait.

### Fixed

- Reloading the web app on any screen but the first no longer shows a 404.
- Today no longer sometimes shows the same activity twice in a section.
- Today's next activity is written ahead again, so it's usually ready when you
  open it. Opening it while it's still being written picks up where that left
  off instead of starting over.
- Reflecting on your progress suggests changes to your path again, instead of
  failing partway.
- The loading dots keep moving while an activity is being written, instead of
  stopping on the first one.
- Video activities play one of your saved videos in the activity, instead of
  pointing you to a YouTube channel.
