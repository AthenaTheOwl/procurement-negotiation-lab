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

// 3. Force a single React copy across the monorepo.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
