import Image from "react-native-image-colors";

export type HEXColorString = string | `#${string}`;
export type HSLColorString = `hsl(${number}, ${number}%, ${number}%)`;

export type HSLColorObject = {
  h: number;
  s: number;
  l: number;
};

export type ColorPalette = {
  color0: HSLColorString;
  color1: HSLColorString;
  color2: HSLColorString;
  color3: HSLColorString;
  color4: HSLColorString;
  color5: HSLColorString;
  color6: HSLColorString;

  txt0?: HSLColorString;
  txt1?: HSLColorString;

  bg0?: HSLColorString;
  bg1?: HSLColorString;
  bg2?: HSLColorString;
  bg3?: HSLColorString;
  bg4?: HSLColorString;
};

export const getDominantColor = async (
  url: string,
): Promise<HSLColorObject> => {
  try {
    const results = await Image.getColors(url, { cache: true });

    if (results.platform === "ios") {
      return hexToHsl(results.background);
    }

    return hexToHsl(results.dominant);
  } catch (error) {
    console.log(error);

    return {
      h: 0,
      s: 0,
      l: 0,
    };
  }
};

export const composePalette = (
  { h, s }: HSLColorObject,
  isDark: boolean,
): ColorPalette => {
  return {
    // Main Gradient
    color6: hslToStr({ h, s: Math.min(s, 0.375), l: isDark ? 0.045 : 0.925 }),
    color2: hslToStr({ h, s: Math.min(s, 0.375), l: isDark ? 0.175 : 0.905 }),

    color0: hslToStr({ h, s: Math.min(s, 0.325), l: isDark ? 0.125 : 0.875 }),

    // Sheet Handle
    color1: hslToStr({ h, s: Math.min(s, 0.325), l: isDark ? 0.145 : 0.85 }),

    // Text Colors, Primary and Secondary
    color3: hslToStr({ h, s: Math.min(s, 0.05), l: isDark ? 0.85 : 0.12 }),
    color4: hslToStr({ h, s: Math.min(s, 0.15), l: isDark ? 0.65 : 0.4 }),

    // Auxiliary Colors
    color5: hslToStr({ h, s: Math.min(s, 0.325), l: isDark ? 0.2 : 0.87 }),
  };
};

export const hslToStr = ({ h, s, l }: HSLColorObject): HSLColorString => {
  return `hsl(${h}, ${s * 100}%, ${l * 100}%)`;
};

export const hexToHsl = (hex: HEXColorString): HSLColorObject => {
  if (!hex) throw new Error("Invalid HEX color");

  // react-native-image-colors returns a hex string like "#rrggbb", but guard
  // against short/invalid forms so a null match never throws here.
  const matches = hex.match(/\w\w/g);
  if (!matches || matches.length < 3) throw new Error("Invalid HEX color");

  let [r, g, b] = matches.map((str) => parseInt(str, 16));

  r /= 255;
  g /= 255;
  b /= 255;

  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);

  let h = 0;
  let s = 0;
  const l: number = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const hslToHex = (hsl: HSLColorString): HEXColorString => {
  const matches = hsl.match(/\d+(\.\d+)?/g);
  if (!matches || matches.length < 3) return "#000000";

  let [h, s, l] = matches.map((str) => parseFloat(str));

  l /= 100;

  const a = (s * Math.min(l, 1 - l)) / 100;

  const f = (n: number) => {
    const k = (n + h / 30) % 12;

    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${f(0)}${f(8)}${f(4)}`;
};
