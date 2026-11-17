import { useTheme, XStack } from "tamagui";
import React, { useCallback, useEffect, useRef } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const NUM_BARS = 3;
const MIN_HEIGHT = 15;
const MAX_HEIGHT = 90;
const UPDATE_INTERVAL = 300;

export const MusicBars = () => {
  const timeout = useRef<NodeJS.Timeout | null>(null);

  const theme = useTheme();
  const color3 = theme.color3.get();

  const animatedValues = Array(NUM_BARS)
    .fill(null)
    .map(() => useSharedValue(Math.random()));

  const updateBars = useCallback(() => {
    animatedValues.forEach((value) => {
      value.value = withTiming(Math.random(), {
        duration: UPDATE_INTERVAL,
        easing: Easing.linear,
      });
    });

    timeout.current = setTimeout(updateBars, UPDATE_INTERVAL);

    return () => clearTimeout(timeout.current!);
  }, [animatedValues]);

  useEffect(() => {
    updateBars();
  }, [updateBars]);

  return (
    <XStack h={20} gap={4} ai="flex-end">
      {animatedValues.map((animatedValue, index) => {
        const animatedStyle = useAnimatedStyle(() => ({
          height: `${MIN_HEIGHT + animatedValue.value * (MAX_HEIGHT - MIN_HEIGHT)}%`,
        }));

        return (
          <Animated.View
            key={index}
            style={[
              {
                backgroundColor: color3,
                borderRadius: 0,
                width: 3,
              },
              animatedStyle,
            ]}
          />
        );
      })}
    </XStack>
  );
};
