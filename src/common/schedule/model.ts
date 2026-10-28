export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
export const STATION_TIME_ZONE = "America/Chicago";
const DAY_MINUTES = 1440;
const WEEK_MINUTES = 7 * DAY_MINUTES;

export type Show = {
  id: string;
  day: number;
  start: number;
  end: number;
  title: string;
  dj: string;
  description: string;
};

// Parse published Sheets CSV, including quoted commas, newlines and doubled quotes.
function csvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  const input = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else field += char;
    } else if (char === "," || char === "\n" || char === "\r") {
      row.push(field.trim());
      field = "";
      closedQuote = false;
      if (char !== ",") {
        rows.push(row);
        row = [];
        if (char === "\r" && input[i + 1] === "\n") i++;
      }
    } else if (char === '"' && !field && !closedQuote) {
      quoted = true;
    } else {
      if (char === '"' || (closedQuote && char.trim())) {
        throw new Error("Invalid CSV quoting.");
      }
      field += char;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  row.push(field.trim());
  rows.push(row);
  return rows.filter((values) => values.some(Boolean));
}

function minutes(value: string, allowEndOfDay = false): number {
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(value);
  if (!match) throw new Error("Use times like 14:00 or 2:00 PM.");
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) throw new Error("Invalid minute.");
  if (match[3]) {
    if (hour < 1 || hour > 12) throw new Error("Invalid 12-hour time.");
    hour = (hour % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  } else if (hour > 23 && !(allowEndOfDay && hour === 24 && minute === 0)) {
    throw new Error("Invalid hour.");
  }
  return hour * 60 + minute;
}

export function parseSchedule(csv: string): Show[] {
  const [header, ...rows] = csvRows(csv);
  const fields = ["day", "start", "end", "show", "dj", "description"];
  const columns = header?.map((field) => field.toLowerCase());
  if (
    !columns ||
    fields.some((name) => columns.indexOf(name) < 0) ||
    new Set(columns).size !== columns.length
  ) {
    throw new Error(
      "Expected columns: day, start, end, show, dj, description.",
    );
  }
  const shows = rows.map((row, index): Show => {
    const value = (name: string) => row[columns.indexOf(name)] || "";
    try {
      if (row.length !== columns.length)
        throw new Error("Column count does not match the header.");
      const day = DAYS.findIndex(
        (name) => name.toLowerCase() === value("day").toLowerCase(),
      );
      if (day < 0) throw new Error("Use a full day name, such as Monday.");
      const start = minutes(value("start"));
      const end = minutes(value("end"), true);
      if (start === end) throw new Error("Start and end must differ.");
      if (!value("show") || !value("dj"))
        throw new Error("Show and DJ are required.");
      return {
        id: `${day}-${start}-${index}`,
        day,
        start,
        end,
        title: value("show"),
        dj: value("dj"),
        description: value("description"),
      };
    } catch (error) {
      throw new Error(`Schedule row ${index + 2}: ${(error as Error).message}`);
    }
  });
  // Reject overlaps, including a Saturday-night show carrying into Sunday.
  const occupied = new Set<number>();
  for (const show of shows) {
    const duration =
      show.end > show.start
        ? show.end - show.start
        : DAY_MINUTES - show.start + show.end;
    for (let minute = 0; minute < duration; minute++) {
      const slot =
        (show.day * DAY_MINUTES + show.start + minute) % WEEK_MINUTES;
      if (occupied.has(slot))
        throw new Error("Schedule contains overlapping shows.");
      occupied.add(slot);
    }
  }
  return shows.sort((a, b) => a.day - b.day || a.start - b.start);
}

export function stationClock(date = new Date()): {
  day: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STATION_TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value;
  return {
    day: DAYS.indexOf(part("weekday") as (typeof DAYS)[number]),
    minute: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

export function isOnAir(show: Show, date = new Date()): boolean {
  const now = stationClock(date);
  const elapsed =
    (now.day * DAY_MINUTES +
      now.minute -
      (show.day * DAY_MINUTES + show.start) +
      WEEK_MINUTES) %
    WEEK_MINUTES;
  const duration =
    show.end > show.start
      ? show.end - show.start
      : DAY_MINUTES - show.start + show.end;
  return elapsed < duration;
}

export function showsForDay(shows: Show[], day: number) {
  return shows
    .filter(
      (show) =>
        show.day === day ||
        (show.end < show.start && show.end > 0 && (show.day + 1) % 7 === day),
    )
    .map((show) => ({ show, continues: show.day !== day }))
    .sort(
      (a, b) =>
        (a.continues ? 0 : a.show.start) - (b.continues ? 0 : b.show.start),
    );
}

export function formatTime(minute: number): string {
  const hour = Math.floor(minute / 60) % 24;
  return `${hour % 12 || 12}:${String(minute % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export function showTime(show: Show): string {
  return `${formatTime(show.start)} – ${formatTime(show.end)}${show.end <= show.start || show.end === 1440 ? " (next day)" : ""}`;
}
