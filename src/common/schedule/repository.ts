import { parseSchedule, type Show } from "./model";

const CACHE_KEY = "kjhk.schedule.v1";
const SAMPLE_CSV = `day,start,end,show,dj,description
Monday,08:00,10:00,Sample Morning Show,Sample DJ,A sample description. Tap any show to read about the host and music.
Wednesday,14:00,16:00,Sample Afternoon Show,Sample DJ,Replace these examples by connecting the published schedule sheet.
Saturday,23:00,01:00,Sample Late Night Show,Sample DJ,An example of a show continuing into Sunday morning.`;

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};
export type ScheduleResult = {
  shows: Show[];
  source: "live" | "cache" | "demo" | "unconfigured";
  updatedAt?: string;
};

// Storage and fetch are injected so network/cache behavior can be tested without native modules.
export async function loadSchedule({
  url,
  storage,
  request = fetch,
  allowDemo = false,
}: {
  url: string;
  storage: Storage;
  request?: typeof fetch;
  allowDemo?: boolean;
}): Promise<ScheduleResult> {
  if (!url)
    return {
      shows: allowDemo ? parseSchedule(SAMPLE_CSV) : [],
      source: allowDemo ? "demo" : "unconfigured",
    };
  if (!/^https:\/\//i.test(url))
    throw new Error("The schedule feed must use HTTPS.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await request(url, {
      signal: controller.signal,
      headers: { Accept: "text/csv" },
    });
    if (!response.ok) throw new Error("Schedule download failed.");
    const csv = await response.text();
    const shows = parseSchedule(csv);
    const updatedAt = new Date().toISOString();
    // A storage failure must not discard a successful network response.
    await storage
      .setItem(CACHE_KEY, JSON.stringify({ url, csv, updatedAt }))
      .catch(() => undefined);
    return { shows, source: "live", updatedAt };
  } catch {
    try {
      const cached = JSON.parse((await storage.getItem(CACHE_KEY)) || "null");
      if (
        cached?.url === url &&
        typeof cached.csv === "string" &&
        typeof cached.updatedAt === "string" &&
        Number.isFinite(Date.parse(cached.updatedAt))
      ) {
        return {
          shows: parseSchedule(cached.csv),
          source: "cache",
          updatedAt: cached.updatedAt,
        };
      }
    } catch {
      /* Invalid or unavailable cache: show the retry state. */
    }
    throw new Error(
      "Couldn’t load the DJ schedule. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
