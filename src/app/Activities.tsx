import LinearGradient from "react-native-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Paragraph,
  Spinner,
  Stack,
  XStack,
  YStack,
  useTheme,
} from "tamagui";

type ActivitiesProps = {
  onNavigateHome?: () => void;
};

type EventItem = {
  id: string;
  title: string;
  dateTime: string;
  location?: string;
  description: string;
};

type ScreenState = "loading" | "error" | "empty" | "loaded";

const events: EventItem[] = [
  {
    id: "1",
    title: "Sunset Yoga in the Park",
    dateTime: "Sat, Oct 5 · 6:30 PM",
    location: "Riverfront Green",
    description:
      "Unwind with a guided flow session followed by tea and a short meditation to close the evening.",
  },
  {
    id: "2",
    title: "Downtown Art Walk",
    dateTime: "Wed, Oct 9 · 7:00 PM",
    location: "Main Street Arts District",
    description:
      "Explore new gallery openings and meet local artists during a curated neighborhood stroll.",
  },
  {
    id: "3",
    title: "Community Tech Meetup",
    dateTime: "Thu, Oct 10 · 6:00 PM",
    description:
      "Lightning talks from product builders plus a demo showcase and networking time afterwards.",
  },
  {
    id: "4",
    title: "Farmers Market Breakfast",
    dateTime: "Sun, Oct 13 · 9:00 AM",
    location: "Old Town Square",
    description:
      "Grab pastries, seasonal produce, and live music while you shop small-batch vendors.",
  },
  {
    id: "5",
    title: "Evening Run Club",
    dateTime: "Tue, Oct 15 · 6:15 PM",
    location: "Trailhead West",
    description:
      "A relaxed 5K with pacing groups for all levels, followed by cooldown stretches.",
  },
];

export const Activities = ({ onNavigateHome }: ActivitiesProps) => {
  const theme = useTheme();
  const color0 = theme.color0.get();
  const color1 = theme.color1.get();
  const color2 = theme.color2.get();
  const color4 = theme.color4.get();
  const color6 = theme.color6.get();

  const [status] = useState<ScreenState>("loaded");

  const content = useMemo(() => {
    if (status === "loading") {
      return (
        <YStack f={1} ai="center" jc="center" gap="$3" px="$6" py="$8">
          <Spinner size="large" color={color6} />
          <Paragraph size="$4" color={color4}>
            Loading activities...
          </Paragraph>
        </YStack>
      );
    }

    if (status === "error") {
      return (
        <YStack f={1} ai="center" jc="center" gap="$3" px="$6" py="$8">
          <Paragraph size="$4" color={color4} ta="center">
            We couldn&apos;t load activities right now.
          </Paragraph>
          <Button
            size="$3"
            br="$6"
            bc={color2}
            color={color6}
            pressStyle={{ backgroundColor: color1, borderColor: color1 }}
          >
            Try again
          </Button>
        </YStack>
      );
    }

    if (status === "empty") {
      return (
        <YStack f={1} ai="center" jc="center" gap="$3" px="$6" py="$8">
          <Paragraph size="$4" color={color4} ta="center">
            No upcoming activities yet.
          </Paragraph>
          <Paragraph size="$2" color={color4} ta="center">
            Check back soon for new community events.
          </Paragraph>
        </YStack>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <YStack gap="$4">
          {events.map((event) => (
            <Stack
              key={event.id}
              bg={color1}
              br="$6"
              p="$4"
              borderWidth={1}
              borderColor={color2}
              gap="$2"
            >
              <Paragraph size="$5" color={color6}>
                {event.title}
              </Paragraph>
              <YStack gap="$1">
                <Paragraph size="$3" color={color4}>
                  {event.dateTime}
                </Paragraph>
                {event.location ? (
                  <Paragraph size="$3" color={color4}>
                    {event.location}
                  </Paragraph>
                ) : null}
              </YStack>
              <Paragraph size="$3" color={color4} numberOfLines={2}>
                {event.description}
              </Paragraph>
            </Stack>
          ))}
        </YStack>
      </ScrollView>
    );
  }, [color1, color2, color4, color6, status]);

  return (
    <LinearGradient style={{ flex: 1 }} colors={[color2, color0]}>
      <StatusBar translucent style="dark" />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <XStack jc="space-between" ai="center" px="$4" py="$3">
          <Paragraph size="$6" color={color6}>
            Activities
          </Paragraph>
          {onNavigateHome ? (
            <Button
              size="$3"
              br="$6"
              bc={color1}
              color={color6}
              pressStyle={{ backgroundColor: color2, borderColor: color2 }}
              onPress={onNavigateHome}
            >
              Home
            </Button>
          ) : null}
        </XStack>
        <Stack f={1}>{content}</Stack>
      </SafeAreaView>
    </LinearGradient>
  );
};
