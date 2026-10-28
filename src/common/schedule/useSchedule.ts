import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadSchedule, type ScheduleResult } from "./repository";

const url = (process.env.EXPO_PUBLIC_SCHEDULE_CSV_URL || "").trim();

export function useSchedule() {
  const [data, setData] = useState<ScheduleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loadSchedule({
        url,
        storage: AsyncStorage,
        allowDemo: __DEV__,
      });
      if (current === generation.current) setData(result);
    } catch (reason) {
      if (current === generation.current) {
        setError((reason as Error).message);
        // Keep visible data, but never imply it is still a fresh live response.
        setData((previous) =>
          previous?.source === "live"
            ? { ...previous, source: "cache" }
            : previous,
        );
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);
  return { data, loading, error, refresh };
}
