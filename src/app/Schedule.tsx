import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Paragraph, useTheme } from "tamagui";
import {
  DAYS,
  STATION_TIME_ZONE,
  isOnAir,
  showTime,
  showsForDay,
  stationClock,
} from "common/schedule/model";
import { useSchedule } from "common/schedule/useSchedule";

export function Schedule({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const background = theme.color0.get();
  const foreground = theme.color3.get();
  const secondary = theme.color4.get();
  const card = theme.color2.get();
  const { data, loading, error, refresh } = useSchedule();
  const [now, setNow] = useState(() => new Date());
  const [day, setDay] = useState(() => stationClock().day);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data?.shows.find((show) => show.id === selectedId);
  const entries = showsForDay(data?.shows || [], day);
  const goBack = () => (selected ? setSelectedId(null) : onClose());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);

  const updatedLabel = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString("en-US", {
        timeZone: STATION_TIME_ZONE,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={goBack}
    >
      <SafeAreaView style={[styles.screen, { backgroundColor: background }]}>
        <View style={styles.header}>
          <Paragraph
            color={foreground}
            size="$7"
            fontWeight="700"
            accessibilityRole="header"
          >
            {selected ? "Show details" : "DJ schedule"}
          </Paragraph>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              selected ? "Back to schedule" : "Close schedule"
            }
            onPress={goBack}
            style={styles.control}
          >
            <Paragraph color={foreground}>
              {selected ? "Back" : "Close"}
            </Paragraph>
          </Pressable>
        </View>
        <Paragraph color={secondary} paddingHorizontal={20} paddingBottom={8}>
          KJHK 90.7 FM · All times Central
        </Paragraph>
        {selected ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Paragraph color={secondary}>
              {DAYS[selected.day]} · {showTime(selected)}
            </Paragraph>
            <Paragraph
              color={foreground}
              size="$8"
              fontWeight="700"
              accessibilityRole="header"
            >
              {selected.title}
            </Paragraph>
            <Paragraph color={foreground} size="$5">
              Hosted by {selected.dj}
            </Paragraph>
            <Paragraph color={foreground} marginTop={16}>
              {selected.description ||
                "No description has been added for this show yet."}
            </Paragraph>
            {data?.source === "demo" && (
              <Paragraph color={secondary} marginTop={16}>
                Sample show — this is not the current KJHK schedule.
              </Paragraph>
            )}
            {data?.source === "cache" && (
              <Paragraph color={secondary} marginTop={16}>
                Saved schedule · Last updated {updatedLabel} CT. Times may have
                changed.
              </Paragraph>
            )}
          </ScrollView>
        ) : (
          <>
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.days}
              >
                {DAYS.map((name, index) => (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    accessibilityState={{ selected: day === index }}
                    onPress={() => setDay(index)}
                    style={[
                      styles.day,
                      { backgroundColor: day === index ? foreground : card },
                    ]}
                  >
                    <Paragraph color={day === index ? background : foreground}>
                      {name.slice(0, 3)}
                    </Paragraph>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <ScrollView
              contentContainerStyle={styles.content}
              refreshControl={
                <RefreshControl
                  refreshing={loading && !!data}
                  onRefresh={refresh}
                  tintColor={foreground}
                />
              }
            >
              <View style={styles.row}>
                <Paragraph
                  color={foreground}
                  size="$6"
                  fontWeight="700"
                  accessibilityRole="header"
                >
                  {DAYS[day]}
                </Paragraph>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDay(stationClock().day)}
                  style={styles.control}
                >
                  <Paragraph color={foreground}>Today</Paragraph>
                </Pressable>
              </View>
              {data?.source === "demo" && (
                <Paragraph
                  color={foreground}
                  backgroundColor={card}
                  padding={12}
                  borderRadius={12}
                >
                  Sample schedule — not current KJHK programming. Connect the
                  schedule sheet to show real shows.
                </Paragraph>
              )}
              {data?.source === "cache" && (
                <Paragraph
                  color={foreground}
                  backgroundColor={card}
                  padding={12}
                  borderRadius={12}
                >
                  Couldn’t refresh. Showing the saved schedule from{" "}
                  {updatedLabel} CT. Times may have changed.
                </Paragraph>
              )}
              {loading && !data && (
                <ActivityIndicator
                  accessibilityLabel="Loading DJ schedule"
                  color={foreground}
                  size="large"
                />
              )}
              {error && (
                <Paragraph accessibilityRole="alert" color={foreground}>
                  {error}
                </Paragraph>
              )}
              {!loading && data && entries.length === 0 && (
                <Paragraph color={secondary}>
                  {data.source === "unconfigured"
                    ? "The in-app schedule isn’t available yet. See the station website for programming."
                    : `No shows listed for ${DAYS[day]}.`}
                </Paragraph>
              )}
              {entries.map(({ show, continues }) => (
                <Pressable
                  key={show.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${show.title}, hosted by ${show.dj}, ${showTime(show)}${continues ? `, continues from ${DAYS[show.day]}` : ""}. Show details.`}
                  onPress={() => setSelectedId(show.id)}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: card, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Paragraph color={secondary}>{showTime(show)}</Paragraph>
                  {continues && (
                    <Paragraph color={secondary} size="$2">
                      Continues from {DAYS[show.day]}
                    </Paragraph>
                  )}
                  {data?.source === "live" && isOnAir(show, now) && (
                    <Paragraph color={foreground} fontWeight="700">
                      Scheduled now
                    </Paragraph>
                  )}
                  <Paragraph color={foreground} size="$6" fontWeight="700">
                    {show.title}
                  </Paragraph>
                  <Paragraph color={foreground}>{show.dj}</Paragraph>
                  <Paragraph color={secondary} numberOfLines={2}>
                    {show.description || "Tap for show details"}
                  </Paragraph>
                </Pressable>
              ))}
              {!loading &&
                data?.source !== "unconfigured" &&
                data?.source !== "demo" && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={refresh}
                    style={styles.control}
                  >
                    <Paragraph color={foreground}>
                      {error ? "Try again" : "Refresh schedule"}
                    </Paragraph>
                  </Pressable>
                )}
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  void Linking.openURL(
                    "https://kjhk.org/web/program-schedule/",
                  ).catch(() => undefined);
                }}
                style={styles.control}
              >
                <Paragraph color={secondary}>
                  View schedule on kjhk.org ↗
                </Paragraph>
              </Pressable>
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 12,
    flexWrap: "wrap",
  },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  days: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  day: {
    minWidth: 60,
    minHeight: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  control: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
    padding: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: { padding: 18, borderRadius: 16, gap: 6 },
});
