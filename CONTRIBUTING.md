# Contributing

Thanks for taking a look. thinkering is a small project, so a short conversation before a big change saves everyone time.

## Where to start

- **Bugs**: open an issue with what you did, what you expected, and what happened, plus the platform (iOS, web) and app version from Me → Settings → About.
- **Ideas and product feedback**: the [feedback board](https://thinkering.featurebase.app/) is where features are discussed and voted on.
- **Code**: pick up an open issue, or open one describing the change before you start on anything larger than a fix. Changes to behavior, the data model or a prompt are easier to agree on as a sketch than as a finished PR.

## Setting up

```sh
pnpm install
cp apps/mobile/.env.example apps/mobile/.env
pnpm verify
pnpm --filter @thinkering/mobile dev
```

You don't need an API key. Dev builds use **fixture AI mode**, which serves recorded model responses, so the whole app runs offline and for free.

The development guide is [AGENTS.md](AGENTS.md): the repo layout, the hard rules, the commands, and how to change the database, a prompt or the UI. It's written for coding agents, and it applies to everyone. The docs it points to in `docs/` are the reference for each area.

## Pull requests

- Keep a PR to one change, and link its issue (`Closes #12`).
- `pnpm verify` passes: formatting, typecheck, lint and tests, offline, in under a minute.
- If the change makes a doc wrong, update the doc in the same PR.
- If a learner would notice the change, add a line under `## Unreleased` in `CHANGELOG.md`.
- Commit messages use `type(scope): summary` — see AGENTS.md.

If you used a coding agent, that's fine. You're still the one vouching for the change, so read the diff before you open the PR.

## License

thinkering is licensed under AGPL-3.0. By contributing, you agree that your contribution is licensed under the same terms.

## Conduct

Everyone taking part is expected to follow the [code of conduct](CODE_OF_CONDUCT.md). To report a security issue, see [SECURITY.md](SECURITY.md) rather than opening a public issue.
