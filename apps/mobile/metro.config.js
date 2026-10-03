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

module.exports = config;
