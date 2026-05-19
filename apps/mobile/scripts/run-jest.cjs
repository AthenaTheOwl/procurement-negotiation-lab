const path = require("node:path");
const Module = require("node:module");

const mobileNodeModules = path.resolve(__dirname, "..", "node_modules");
process.env.NODE_PATH = [mobileNodeModules, process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

require("jest/bin/jest");
