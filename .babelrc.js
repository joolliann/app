process.env.TAMAGUI_TARGET = "native";

module.exports = (api) => {
  api.cache(true);

  return {
    presets: [["babel-preset-expo", { jsxRuntime: "automatic" }]],
    plugins: [
      "transform-inline-environment-variables",
      "react-native-worklets/plugin",
    ],
  };
};
