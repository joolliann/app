import BottomSheet from "@gorhom/bottom-sheet";
import {
  useBottomSheetOpen,
  useNowPlaying,
  useNowPlayingLoaded,
} from "common/atoms";
import { composePalette } from "common/colors";
import { Constants, colorAtom, themeAtom } from "common/const";
import { Album, Controller, NowLive, NowPlaying, Share } from "elements";
import { ProgressBar } from "elements/player/Progress";
import { MusicLogs } from "elements/sheets/MusicLogs";
import { ViewExtra } from "elements/sheets/ViewExtras";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useAtomValue } from "jotai";
import {
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform, useWindowDimensions, type View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import LinearGradient from "react-native-linear-gradient";
import Animated, {
  Extrapolation,
  FadeIn,
  SharedValue,
  SlideInRight,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Button,
  Paragraph,
  Stack,
  XStack,
  getTokens,
  updateTheme,
  useForceUpdate,
  useTheme,
} from "tamagui";

type Position = { x: number; y: number };

SplashScreen.preventAutoHideAsync();

type HomeProps = {
  onNavigateActivities?: () => void;
};

export const Home = ({ onNavigateActivities }: HomeProps) => {
  const loaded = useNowPlayingLoaded();
  const themeLoaded = useRef(false);

  const theme = useTheme();
  const token = getTokens();

  const color0 = theme.color6?.get();
  const color2 = theme.color2?.get();
  const color4 = theme.color4?.get();

  const viewExtraRef = useRef<BottomSheet>();
  const musicLogsRef = useRef<BottomSheet>();
  const lyricsSheetRef = useRef<BottomSheet>();

  const bottomSheetOpen = useBottomSheetOpen();

  const { width: screenW, height: screenH } = useWindowDimensions();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const dominantColor = useAtomValue(colorAtom);

  const { track, cover, timestamp } = useNowPlaying();

  const darkMode = useAtomValue(themeAtom);

  const forceUpdate = useForceUpdate();

  useEffect(() => {
    if (loaded) {
      const color = dominantColor ?? Constants.DefaultColor;
      const theme = composePalette(color, darkMode);

      updateTheme({ name: "light", theme });
      forceUpdate();

      if (!themeLoaded.current) {
        themeLoaded.current = true;
      }
    }
  }, [loaded, timestamp, darkMode]);

  const stackRef = useRef<View>();
  const imageRef = useRef<Animated.View>();

  const animated = useSharedValue(0);

  const [imagePos, setImagePos] = useState<Position>({ x: 0, y: 0 });

  const imageSize = screenW >= 760 ? screenW * 0.75 : screenW * 0.875;
  const imageScale = 52 / imageSize;

  const imagePadding = token.space["$3"].val;

  const translateX = useMemo(() => {
    const centerX = (screenW - imageSize) / 2;

    const centerXScaled = (screenW - imageSize * imageScale) / 2;
    const centerXOffset = centerX - imagePos.x - (centerXScaled - centerX);

    return centerXOffset - centerX + imagePadding;
  }, [screenW, imagePos.y]);

  const translateY = useMemo(() => {
    const centerY = (screenH - imageSize) / 2;

    const centerYScaled = (screenH - imageSize * imageScale) / 2;
    const centerYOffset =
      centerY - (imagePos.y - topInset) - (centerYScaled - centerY);

    return centerYOffset - centerY + imagePadding;
  }, [screenH, imagePos.y]);

  const imageContainerStyles = useAnimatedStyle(() => {
    return {
      zIndex: interpolate(
        animated.value,
        [0, 1],
        [0, 9999],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            animated.value,
            [0, 1],
            [0, translateX],
            Extrapolation.CLAMP,
          ),
        },
        {
          translateY: interpolate(
            animated.value,
            [0, 1],
            [0, translateY],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            animated.value,
            [0, 1],
            [1, imageScale],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const imageStyles = useAnimatedStyle(() => ({
    borderRadius: interpolate(
      animated.value,
      [0, 1],
      [15, 55],
      Extrapolation.CLAMP,
    ),
  }));

  const calculateImagePosition = useCallback(() => {
    if (imageRef.current && stackRef.current) {
      imageRef.current.measureLayout(stackRef.current, (x, y) => {
        setImagePos({ x, y });
      });
    }
  }, [imageRef, stackRef]);

  const paddingBottom = useMemo(() => {
    return (
      Constants.BottomSheetHeight +
      bottomInset -
      Platform.select({ ios: 35, default: 0 })
    );
  }, [bottomInset]);

  const onLayoutRootView = useCallback(async () => {
    if (loaded) {
      await SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded || !themeLoaded.current) return null;

  return (
    <LinearGradient
      style={{ flex: 1 }}
      colors={[color2, color0]}
      onLayout={onLayoutRootView}
    >
      <StatusBar translucent style={darkMode ? "light" : "dark"} />
      <SafeAreaView
        ref={stackRef}
        style={{ flex: 1 }}
        edges={{ bottom: "off" }}
      >
        <Stack
          f={1}
          ai="center"
          jc="center"
          pb={paddingBottom}
          animation="slow"
          y={0}
          scale={1}
          enterStyle={{
            y: 75,
            scale: 0.8,
          }}
          gap="$1"
        >
          <FadeAway direction="up" animated={animated}>
            <XStack jc="space-between" ai="center" mb="$4" w={imageSize}>
              <Album />
              <XStack gap="$2" ai="center">
                <NowLive />
                {onNavigateActivities ? (
                  <Button
                    size="$3"
                    br="$6"
                    bc={color2}
                    color={color4}
                    pressStyle={{
                      backgroundColor: color0,
                      borderColor: color0,
                    }}
                    onPress={onNavigateActivities}
                  >
                    Activities
                  </Button>
                ) : null}
              </XStack>
            </XStack>
          </FadeAway>

          <Animated.View ref={imageRef} style={[imageContainerStyles]}>
            <Animated.Image
              key={track}
              style={[{ width: imageSize, height: imageSize }, imageStyles]}
              source={{ uri: `${cover}` }}
              entering={
                bottomSheetOpen
                  ? FadeIn.duration(400)
                  : SlideInRight.duration(400)
              }
              onLayout={calculateImagePosition}
            />
          </Animated.View>

          <FadeAway direction="down" animated={animated}>
            <Stack gap="$5" mt="$6" w={imageSize} fd="column">
              <XStack gap="$1.5">
                <NowPlaying />
                <Share />
              </XStack>
              <Suspense>
                <ProgressBar />
              </Suspense>
              <Controller />
            </Stack>
          </FadeAway>

          <MusicLogs
            ref={musicLogsRef}
            extraRef={viewExtraRef}
            animation={animated}
          />

          <ViewExtra ref={viewExtraRef} />

          <LyricsSheet ref={lyricsSheetRef} />
        </Stack>
      </SafeAreaView>
    </LinearGradient>
  );
};

const LyricsSheet = forwardRef((_, ref: any) => {
  return (
    <BottomSheet
      ref={ref}
      snapPoints={[500]}
      index={-1}
      enablePanDownToClose
      enableDynamicSizing={false}
      handleComponent={() => null}
    >
      <Lyrics />
    </BottomSheet>
  );
});

const Lyrics = () => {
  const theme = useTheme();
  const color0 = theme.color0.get();
  const color1 = theme.color1.get();
  const color2 = theme.color2.get();
  const color4 = theme.color4.get();
  const color5 = theme.color5.get();
  const color6 = theme.color6.get();

  const { artist, track } = useNowPlaying();

  const lyrics = `
  [Intro]
  I'm a rebel just for kicks, now
  I been feeling it since 1966, now
  Might be over now, but I feel it still
  Ooh woo, I'm a rebel just for kicks, now
  Let me kick it like it's 1986, now
  Might be over now, but I feel it still
  Got another mouth to feed
  Leave it with a baby sitter, mama, call the grave digger
  Gone with the fallen leaves
  Am I coming out of left field?
  Ooh woo, I'm a rebel just for kicks, now
  I been feeling it since 1966, now
  Might've had your fill, but you feel it still
  [Verse 1]
  Got another mouth to feed
  Leave it with a baby sitter, mama, call the grave digger
  Gone with the fallen leaves
  Am I coming out of left field?
  Ooh woo, I'm a rebel just for kicks, now
  I been feeling it since 1966, now
  `;

  return (
    <Stack
      f={1}
      p="$4"
      bg={color0}
      borderTopLeftRadius={0}
      borderTopRightRadius={0}
    >
      <XStack gap="$2" ai="center">
        <Paragraph color={color4} size="$2">
          {track}
        </Paragraph>
        <Paragraph color={color4} size="$2">
          {artist}
        </Paragraph>
      </XStack>
      <ScrollView>
        <Paragraph color={color4} size="$2">
          {lyrics}
        </Paragraph>
      </ScrollView>
    </Stack>
  );
};

type FadeAwayProps = PropsWithChildren<{
  animated: SharedValue<number>;
  direction: "up" | "down";
}>;

const FadeAway = ({ children, animated, direction }: FadeAwayProps) => {
  const fadeAwayAnimationStyle = useAnimatedStyle(() => {
    return {
      zIndex: -1,
      opacity: interpolate(
        animated.value,
        [0, 0.5],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            animated.value,
            [0, 0.5],
            [0, direction === "up" ? -15 : 15],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[fadeAwayAnimationStyle]}>{children}</Animated.View>
  );
};
