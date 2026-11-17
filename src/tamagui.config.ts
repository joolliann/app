import { createAnimations } from "@tamagui/animations-react-native";
import { createInterFont } from "@tamagui/font-inter";
import { shorthands } from "@tamagui/shorthands";
import { themes, tokens } from "@tamagui/themes";
import { createTamagui } from "tamagui";
import { composePalette } from "./common/colors";

// Default palette used until the album art color is resolved
const defaultPalette = composePalette({ h: 0, s: 0, l: 0 }, false);

const config = createTamagui({
  animations: createAnimations({
    fast: {
      type: "spring",
      damping: 20,
      mass: 1.2,
      stiffness: 250,
    },
    medium: {
      damping: 10,
      mass: 0.9,
      stiffness: 100,
    },
    slow: {
      damping: 20,
      stiffness: 60,
    },
  }),
  shorthands,
  fonts: {
    heading: createInterFont({
      weight: {
        7: "700",
      },
      face: {
        700: { normal: "InterBold" },
      },
    }),
    body: createInterFont(
      { face: { 700: { normal: "InterBold" } } },
      {
        sizeSize: (size) => Math.round(size * 1.1),
        sizeLineHeight: (size) =>
          Math.round(size * 1.1 + (size > 20 ? 10 : 10)),
      },
    ),
  },
  themes: {
    ...themes,
    light: {
      ...themes.light,
      ...defaultPalette,
    },
  },
  tokens,
});

export type AppConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
