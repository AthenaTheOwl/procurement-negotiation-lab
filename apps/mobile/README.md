# @lab/mobile

The procurement-negotiation-lab Expo + React Native app. Mirrors the
8-level walkthrough from the web build using the same `@lab/engine`
package, with a mobile-native primitives layer.

## What ships in v1

- Home screen with "Start playing" / "Continue at Level N"
- All 8 levels (gap, sweet spot, info, splits, mechanisms, three-party,
  audit, author your own) — same engine, mobile-native primitives.
- Sandbox stub: routes users to the deployed web sandbox.

## Mobile-vs-web differences

- **Knobs use +/- buttons** rather than continuous slider gestures.
  Native slider drag would need `@react-native-community/slider` or a
  PanResponder-based primitive; v1 ships discrete steps so the level
  flow stays identical without that dependency.
- **Level 4 has no SVG curve.** The web version renders two
  `<UtilityCurve>` panels; the mobile version shows numeric readouts
  per party (buyer/supplier utility vs outside option). Same math,
  smaller surface.
- **Level 5 is static.** The three mechanism panels show final stats
  rather than animating dots; `algorithmResults()` runs once. Adding
  RN raf-driven SVG is straightforward but out of scope for v1.

## What is deliberately deferred to v2

- **Native sandbox.** The legacy `SandboxApp` pulls cytoscape (graph
  layout), Acorn (formula compilation through Babel transform), and a
  large component tree. Porting it warrants its own spec; the v1
  mobile build directs the user to the deployed web copy via
  `Linking.openURL`.
- **Reanimated motion.** Once a motion library is bedded in, every
  "reveal" panel can fade/slide in instead of pop-in.

## Running locally (any platform with Expo)

```
cd apps/mobile
npm install
npx expo start
```

Then press `i` for iOS simulator (macOS only), `a` for Android
emulator (any host), or `w` to launch the web fallback.

## Notes for Windows hosts

The author of this scaffold worked on Windows; iOS Simulator is not
available there. To smoke-test the mobile build from Windows:

1. Run `npx expo start --android` against an Android emulator
   installed via Android Studio.
2. Or use Expo Go on a phone: scan the dev-server QR code.
3. Or use `--web` for a quick check; native-only modules will warn.

## Building for production

EAS Build via `eas.json` profiles:

```
npm install -g eas-cli
eas login
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

The Windows-host caveat applies to iOS builds: cloud build works
fine, but distributing to TestFlight needs an Apple Developer account
and a Mac for signing automation (or use `eas submit`).
