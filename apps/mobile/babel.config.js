module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@lab/engine": "../../packages/engine/src/index.ts",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
