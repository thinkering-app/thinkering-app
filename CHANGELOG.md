# Changelog

User-visible changes, newest first. One entry per TestFlight or App Store
build; internal refactors and docs don't appear here. The conventions are in
[RELEASING.md](RELEASING.md).

## Unreleased

### Added

- The end of each activity names its activity type, with an ⓘ that
  says what it is and why it helps.
- Creating a Next or Strengthen activity, you can choose its activity type
  too. It starts folded away, and each type has an ⓘ.
- Choosing Watch Along or Guided Reading for a new activity, you pick the
  video or reading it's built on, or add a new one right there.
- Long answers and notes show how much room is left as you near the limit.
  Past it, nothing you wrote is cut: sending waits until it fits.
- Under each written answer in an activity: "Think about…", for a
  way in when you're stuck, and "Ask a question". The Ask button is a speech
  bubble now.
- Settings are one tap away from anywhere: the ⚙ now sits in the top-right of
  Today, Path and History as well as Me.
- Delete all data, in Account and data: your interests, path and history go
  from this device — and from our server, if you're signed in — for good.
- Me → Settings → AI says why there's a daily limit, and where to write to us
  if you keep running into it or need more.
- Have a code? In Me → Settings → AI, a code we've given you adds to your
  daily amount from then on.
- A page written in answer to something you asked now shows your question at
  the top of it, so it still reads as a reply when you come back to it.
- Anonymous usage analytics, which never carry any personal content or data. They're on
  unless you turn them off in Account and data.
- Share session replays with the developers, if you choose — asked on the
  welcome screen, and a separate setting in Account and data. Off unless you
  turn it on.
- Delete your backup account from inside the app.
- Sign in to your account from the welcome screen, and your learning comes
  back with it. Restoring from a backup file is right beside it.
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
  time you add an interest. Back from the first question always goes
  somewhere: the welcome screen on your first interest, otherwise the screen
  you started from.

### Changed

- A section's ⚙ is now Activity settings: a plain list of the kinds of
  activity it makes, each with an on/off switch and an ⓘ that says what it
  is.
- The + for a new activity and the off switches have a clearer edge.
- Creating an activity, the goal list starts folded away. Open it to pick
  an existing goal; leave it closed and the activity comes from your focus,
  or where the section would go next.
- Adding an interest asks for one thing you want to learn. The first time,
  it says you can add more later.
- On a computer's browser, thinkering sits in a column down the middle of
  the window instead of stretching across it.
- Tapping a day on the Me calendar lists what you did under the calendar
  instead of opening a sheet over it. Tap the day again to close the list.
- A card being written on Today shows how long it will take as soon as its
  first page is ready, rather than Writing. Tap it and you can start reading
  while the rest arrives.
- Add a link and Find more sit at the top of Resources, where a long list
  can't push them out of sight.
- Strengthen is optional in your learning routine, like Go further.
- A new interest starts with two suggested resources — one to watch and one to
  read — rather than a list to work through. Each points at a single video or
  article you can open, not a channel or a home page.
- Find more, in Resources, is coming soon: the button is there, but it
  doesn't search yet.
- Today writes the Next card ahead of time; Strengthen and Go further say
  Write and are written when you ask for one. Nothing is generated for a card
  you never open.
- The look back at your answers, just before the end of an activity, is one
  short paragraph on the single thing worth saying — not a second lesson.
- The recap at the end of an activity is shorter too: a line or two on the
  idea worth keeping.
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
- While an activity is being written, it shows what it will be: its title,
  goal, kind of activity and length.
- Your new path starts appearing within a few seconds instead of half a minute.
- Today writes two activities at a time, so the second section's card is
  ready sooner.
- An activity that was still being written when you left the app is written
  again when you come back, instead of waiting for you to tap Write.

### Fixed

- Today no longer makes a Watch Along with nothing to watch, or a Guided
  Reading with nothing to read. Without a saved video or reading for it, those
  types are skipped; a section with no other type waits for you to add one
  from its + card.
- When the web search behind finding resources stops working, it gives up
  as soon as it knows, and never runs past four minutes, instead of leaving
  you waiting.
- Starting a new interest works again on a version of the app installed before
  the last update. It failed straight away, with nothing to say why; if an
  update is what's needed, the app now says so.
- Deleting your backup account no longer fails.
- Leaving a screen while something was being written no longer counts the
  whole generation against your daily amount, so you reach the cap far less
  often.
- A page you asked for mid-activity stays where it was put. It could disappear
  moments after arriving — taking you to the end of the activity with it — if
  the review page was still being written when you asked.
- Fill-in-the-blank sentences wrap instead of running off the screen, and the
  answer to a blank you got wrong appears once you move on from it, labeled,
  rather than while you're still typing.
- The review page after an activity is shorter, focuses on one thing, and
  sees the full fill-in-the-blank sentence, so it no longer misreads what you
  were asked.
- Fill-in-the-blank questions are written so earlier pages teach the answer
  and nothing nearby gives it away.

- Reloading the web app on any screen but the first no longer shows a 404.
- Today no longer sometimes shows the same activity twice in a section.
- Today's next activity is written ahead again, so it's usually ready when you
  open it. Opening it while it's still being written picks up where that left
  off instead of starting over.
- Reflecting on your progress suggests changes to your path again, instead of
  failing partway.
- The loading dots keep moving for as long as the wait lasts, instead of
  stopping on the first one.
- Video activities play one of your saved videos in the activity, instead of
  pointing you to a YouTube channel.
