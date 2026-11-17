import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { MoreHorizontal, Music } from "@tamagui/lucide-icons";
import {
  fetchCover,
  fetchNowPlayingHistory,
  type NowPlayingStatus,
} from "common/api";
import {
  bottomSheetOpenAtom,
  useNowPlaying,
  useStreamStatus,
} from "common/atoms";
import { TruncatedText } from "elements/visuals";
import { useSetAtom } from "jotai";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import {
  BackHandler,
  Linking,
  Platform,
  useWindowDimensions,
} from "react-native";
import { BorderlessButton, RectButton } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Circle,
  Paragraph,
  Separator,
  Square,
  Stack,
  XStack,
  YStack,
  styled,
  useTheme,
} from "tamagui";
import { ArrowUp } from "../icons";
import { Song } from "../visuals/Song";
import { SheetBackground } from "./MusicLog/Background";
import { SheetHandle } from "./MusicLog/Handle";

type MusicLogsProps = {
  extraRef: RefObject<BottomSheetModal>;
  animation: SharedValue<number>;
};
type MusicLogsRef = RefObject<BottomSheet>;

export const MusicLogs = forwardRef<BottomSheet, MusicLogsProps>(
  ({ extraRef, animation }, ref: MusicLogsRef) => {
    const { height: screenHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const nowPlaying = useNowPlaying();

    const bottomSheetHeight = screenHeight * 0.08;
    const bottomSheetHeightWithPadding = bottomSheetHeight + insets.bottom / 2;

    const setBottomSheetOpen = useSetAtom(bottomSheetOpenAtom);

    const streamIsLive = useStreamStatus();
    const [modal, setModal] = useState(false);
    const [songs, setSongs] = useState<NowPlayingStatus[]>([]);
    const [lastSong, setLastSong] = useState<NowPlayingStatus | null>(null);

    useEffect(() => {
      const fetchSongs = async () => {
        if (nowPlaying.track === "The Sound Alternative") {
          return;
        }

        const history = await fetchNowPlayingHistory();
        const promises = history.map(async (entry) => {
          const cover = await fetchCover(
            entry.artist,
            entry.track,
            entry.album,
            "sm",
          );
          return { ...entry, cover };
        });

        const newSongs = await Promise.all(promises);

        const sorted = newSongs
          .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
          .filter((song) => song.timestamp !== nowPlaying.timestamp);

        setSongs(sorted);
      };

      fetchSongs();
    }, []);

    useEffect(() => {
      setLastSong(nowPlaying);
      if (!lastSong) return;

      setSongs((prev) => {
        const newSongs = Array.from([lastSong, ...prev]);
        return newSongs;
      });
    }, [nowPlaying.timestamp]);

    BackHandler.addEventListener("hardwareBackPress", () => {
      if (modal) {
        ref.current?.collapse();
        return true;
      }

      return true;
    });

    const openSheet = () => ref.current.expand();

    const paddingBottom = Math.max(
      insets.bottom - Platform.select({ ios: 25, default: 0 }),
      0,
    );

    const headerAnimation = useAnimatedStyle(() => {
      return {
        opacity: interpolate(
          animation.value,
          [0, 0.25],
          [1, 0],
          Extrapolation.CLAMP,
        ),
      };
    });

    const headerBackAnimation = useAnimatedStyle(() => {
      return {
        opacity: interpolate(
          animation.value,
          [0.8, 1],
          [0, 1],
          Extrapolation.CLAMP,
        ),
        transform: [
          {
            translateY: interpolate(
              animation.value,
              [0.8, 1],
              [15, 0],
              Extrapolation.CLAMP,
            ),
          },
        ],
      };
    });

    const theme = useTheme();

    const color0 = theme.color0?.val;
    const color1 = theme.color1?.val;
    const color2 = theme.color2?.val;
    const color3 = theme.color3?.val;
    const color4 = theme.color4?.val;

    const rippleColor = color3
      .replace("hsl", "hsla")
      .replace(")", `, ${0.75})`);

    const Header = useMemo(() => {
      return (
        <Stack>
          <Animated.View
            style={[
              {
                position: "absolute",
                width: "100%",
                zIndex: 1,
              },
              headerAnimation,
            ]}
          >
            <Stack btlr={15} btrr={15} ov="hidden">
              <RectButton
                style={{
                  height: bottomSheetHeightWithPadding,
                  opacity: !streamIsLive ? 0.5 : 1,
                }}
                onPress={openSheet}
                rippleColor={rippleColor}
                underlayColor={color4}
              >
                <Container h={bottomSheetHeight}>
                  <Circle size="$4" />
                  <Circle size="$4">
                    <ArrowUp />
                  </Circle>
                  <RectButton
                    rippleColor={rippleColor}
                    underlayColor={color4}
                    onPress={() => {
                      extraRef.current.present();
                    }}
                    rippleRadius={28}
                    style={{
                      borderRadius: 28,
                    }}
                  >
                    <Button
                      chromeless
                      pressStyle={{
                        backgroundColor: "transparent",
                        borderColor: "transparent",
                      }}
                      hoverStyle={{
                        backgroundColor: "transparent",
                        borderColor: "transparent",
                      }}
                      circular
                      w="$4"
                      h="$4"
                    >
                      <MoreHorizontal color={color3} size={20} />
                    </Button>
                  </RectButton>
                </Container>
              </RectButton>
            </Stack>
          </Animated.View>
          <Animated.View style={[headerBackAnimation]}>
            <Stack gap="$4" p="$3" pb="$-0.5">
              <Song song={nowPlaying} noCover />
              <Separator borderColor={color2} />
            </Stack>
          </Animated.View>
        </Stack>
      );
    }, [nowPlaying.timestamp]);

    const animatedContentOpacity = useAnimatedStyle(() => {
      return {
        opacity: interpolate(
          animation.value,
          [0.25, 1],
          [0, 1],
          Extrapolation.CLAMP,
        ),
      };
    });

    const animatedBackground = useAnimatedStyle(() => {
      return {
        backgroundColor: interpolateColor(
          animation.value,
          [0, 1],
          [color1, color0],
        ),
      };
    });

    const animatedSongListStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateY: interpolate(
              animation.value,
              [0, 1],
              [screenHeight / 4, 0],
              Extrapolation.CLAMP,
            ),
          },
        ],
      };
    });

    const snapPoints = useMemo(() => {
      return [screenHeight * 0.08 + paddingBottom, "100%"];
    }, [insets.bottom]);

    const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => {
      return (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={0}
          appearsOnIndex={1}
          pressBehavior="collapse"
        />
      );
    }, []);

    const mappedSongs = useMemo(() => {
      return songs.length
        ? songs.map((song, i) => (
            <YStack key={i} py="$1.5">
              <RectButton
                onPress={() => {
                  Linking.openURL(
                    `https://www.youtube.com/results?search_query=${song.artist} - ${song.track}`,
                  );
                }}
                rippleColor={rippleColor}
                underlayColor={color4}
              >
                <Stack px="$3" py="$2">
                  <Song song={song} />
                </Stack>
              </RectButton>
            </YStack>
          ))
        : [...Array(15)].map((_, i) => (
            <Stack key={i} px="$3" py="$2">
              <Song.Skeleton key={i} />
            </Stack>
          ));
    }, [songs.length, theme]);

    const onPressOpen = useCallback(() => {
      const search = `${nowPlaying.artist} - ${nowPlaying.track}`;

      Linking.openURL(`https://www.youtube.com/results?search_query=${search}`);
    }, [nowPlaying.artist, nowPlaying.track]);

    return (
      <BottomSheet
        ref={ref}
        topInset={insets.top}
        snapPoints={snapPoints}
        animatedIndex={animation}
        handleComponent={useCallback((props) => <SheetHandle {...props} color={color3} />, [color3])}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: color1,
        }}
        enableDynamicSizing={false}
        backgroundComponent={useCallback((props) => <SheetBackground {...props} color0={color0} color1={color1} />, [color0, color1])}
        onChange={(index) => {
          if (index === 0) {
            setBottomSheetOpen(false);
            setModal(false);
          } else {
            setBottomSheetOpen(true);
            setModal(true);
          }
        }}
      >
        {Header}
        <Animated.View style={[animatedSongListStyle]}>
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[1]}
            style={[
              animatedContentOpacity,
              {
                marginBottom: insets.bottom + 15,
              },
            ]}
          >
            <XStack
              f={1}
              gap="$4"
              ai="center"
              jc="space-between"
              pt="$2"
              px="$3"
            >
              <YStack f={1} gap="$0.75">
                <Paragraph size="$2" col={color4}>
                  Playing from
                </Paragraph>
                <TruncatedText size="$3" col={color3}>
                  {nowPlaying.album}
                </TruncatedText>
              </YStack>
              <Button
                onPress={onPressOpen}
                size="$3"
                br="$5"
                bc={color2}
                color={color3}
                pressStyle={{
                  backgroundColor: rippleColor,
                  borderColor: rippleColor,
                }}
              >
                <Music size={16} color={color3} />
                Open
              </Button>
            </XStack>
            <Stack>
              <Animated.View style={[animatedBackground]}>
                <TruncatedText size="$2" px="$3" py="$2.5" col={color4}>
                  Recently played ({songs.length})
                </TruncatedText>
              </Animated.View>
            </Stack>
            {mappedSongs}
            <Square size="$5" />
          </BottomSheetScrollView>
        </Animated.View>
      </BottomSheet>
    );
  },
);

export const Container = styled(XStack, {
  px: "$4",
  jc: "space-between",
  ai: "center",
});
