# Security

Please don't report security issues in a public issue. Email **hello@thinkering.app** with "Security" in the subject, what you found, and how to reproduce it.

In scope:

- The API routes in `apps/web` — the AI proxy, device registration and request signing, usage metering, feedback and account deletion.
- Anything that could expose a learner's data: backup and sync (Supabase RLS), export files, or data leaving the device other than as described in `docs/08-analytics-and-privacy.md`.
- Secrets reaching the client or the repo.

Please don't run tests that spend the proxy's shared budget at volume, touch other people's accounts, or degrade the service for others.
