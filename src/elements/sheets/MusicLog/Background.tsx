import { BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";
import { useMemo } from "react";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";
import { View } from "react-native";

type Props = BottomSheetBackgroundProps & { color0: string; color1: string };

export const SheetBackground = ({ style, animatedIndex, color0, color1 }: Props) => {
  // * region: styles
  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        animatedIndex.value,
        [0, 1],
        [color1, color0],
      ),
    };
  });

  const backgroundStyle = useMemo(() => {
    return [style, backgroundAnimatedStyle, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }];
  }, [backgroundAnimatedStyle]);

  // * region: render
  return <Animated.View style={backgroundStyle} />;
};
