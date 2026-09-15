# E2E flows

Three Maestro flows on the iOS simulator, run before a release rather than per
PR (`docs/10` Tier 6). They run in **fixture AI mode**, so every generation is a
recorded response: deterministic, offline, zero tokens.

```sh
# 1. Metro in fixture mode, on a port no other workspace is using.
EXPO_PUBLIC_AI_MODE=fixture pnpm --filter @thinkering/mobile dev --port 8090

# 2. Open the app once on the simulator (Expo Go, or a dev build), then:
# against a dev/EAS build:
JAVA_HOME=/usr/local/opt/openjdk pnpm e2e
# via Expo Go (needs the Metro URL, since clearing state clears the project):
JAVA_HOME=/usr/local/opt/openjdk APP_ID=host.exp.Exponent \
  DEV_URL=exp://127.0.0.1:8090/--/ pnpm e2e
```

`APP_ID` defaults to `app.thinkering`. For a standalone run, build the `e2e`
EAS profile (`eas build -p ios --profile e2e`), which bakes
`EXPO_PUBLIC_AI_MODE=fixture` in and needs no Metro.

Flows address elements by `testID` (`id:` in the yaml). Matching by visible text
is unreliable on our `Pressable`s, and point percentages break the moment a
layout moves — if a flow needs a new handle, add a `testID`, don't tap a point.
