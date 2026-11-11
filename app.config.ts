import type { ExpoConfig } from "@expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default (): ExpoConfig => ({
  owner: "kjhk",
  version: "2.0.0",
  name: IS_DEV ? "KJHK (Dev)" : "KJHK",
  description:
    "KJHK 90.7 FM is a student-run radio station at the University of Kansas.",
  slug: "kjhk",
  icon: "./images/icons/icon.png",
  githubUrl: "https://github.com/kjhk907/app",
  splash: {
    image: "./images/splash.png",
    backgroundColor: "#FFF2E0",
  },
  android: {
    package: IS_DEV ? "org.kjhk.app.dev" : "org.kjhk.kjhk",
  },
  ios: {
    bundleIdentifier: "org.KJHK.KJHK",
    infoPlist: {
      UIBackgroundModes: ["audio"],
    },
    supportsTablet: true,
  },
  orientation: "portrait",
  extra: {
    eas: {
      projectId: "c9891cbc-626d-4329-a7a7-48957f1961d5",
    },
  },
  plugins: [
    "expo-font",
    "./plugins/transparentSplashScreen.js",
    "./plugins/transparentNavigation.js",
    [
      "expo-navigation-bar",
      {
        backgroundColor: "#00000080",
      },
    ],
  ],
  experiments: {
    tsconfigPaths: true,
  },
});
