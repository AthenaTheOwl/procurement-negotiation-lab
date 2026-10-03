// Metro config — extends the default Expo config so we can pull
// @lab/engine from the monorepo's packages/ directory.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo so changes in packages/engine hot-reload.
config.watchFolders = [workspaceRoot];

// 2. Let Metro resolve modules from the app's node_modules first, then
//    from the monorepo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Leave Metro's hierarchical node_modules lookup on. It used to be disabled
//    here to force a single React copy, but npm installs some transitive
//    packages nested rather than hoisted — react-native 0.74.0 keeps its
//    @react-native/virtualized-lists at
//    apps/mobile/node_modules/react-native/node_modules/@react-native/virtualized-lists
//    — and with the walk-up disabled, nodeModulesPaths above is the only search
//    path, so that nested copy is unreachable. The release bundle failed with
//    "Unable to resolve module @react-native/virtualized-lists". The debug build
//    never caught it because a debug APK does not bundle at all.
//    disableHierarchicalLookup suits strict-isolation installers (pnpm); with
//    npm workspaces, hoisting plus the nodeModulesPaths order above already
//    keeps one React copy.

// 4. Hide the stray react-native copy nested under expo. `@expo/vector-icons`
//    peer-depends on `react-native: *`, so npm installs the latest release
//    (0.85.3) beside expo even though this app pins 0.74.0. With the walk-up
//    re-enabled above, Metro would resolve react-native to that copy and fail on
//    its newer Flow syntax ("Missing semicolon" in its index.js). Blocking the
//    path leaves the install tree alone — pinning react-native in the root
//    overrides instead broke expo's gradle autolinking during configuration.
const strayReactNative = path.resolve(
  workspaceRoot,
  "node_modules/expo/node_modules/react-native",
);
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  new RegExp(
    `^${strayReactNative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\\/g, "[\\\\/]")}[\\\\/].*$`,
  ),
];

module.exports = config;
