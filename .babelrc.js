process.env.TAMAGUI_TARGET = "native";

module.exports = (api) => {
  api.cache(true);

  return {
    presets: [["babel-preset-expo", { jsxRuntime: "automatic" }]],
    plugins: [
      [
        "@tamagui/babel-plugin",
        {
          components: ["tamagui"],
          config: "./src/tamagui.config.ts",
          logTimings: true,
        },
      ],
      [
        "transform-inline-environment-variables",
        { include: ["TAMAGUI_TARGET", "APP_VARIANT"] },
      ],
    ],
  };
};
