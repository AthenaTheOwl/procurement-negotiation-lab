// Entry point for the mobile build.
//
// `main` previously pointed at `expo-router/entry`, which is what the original
// scaffold shipped. This app does not use expo-router — there is no `app/`
// directory, and App.tsx is a self-contained state machine over `kind / level`
// — so the router found no routes and App.tsx was never mounted. The built APK
// launched to an empty surface, which is why the Maestro flows could not find
// `home-surface`. Unit tests import components directly, so they never covered
// the entry.
import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
