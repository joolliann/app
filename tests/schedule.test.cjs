const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const compiled = path.join(
  process.env.SCHEDULE_BUILD_DIR,
  "src/common/schedule",
);
const {
  parseSchedule,
  stationClock,
  isOnAir,
  showsForDay,
  formatTime,
} = require(path.join(compiled, "model.js"));
const { loadSchedule } = require(path.join(compiled, "repository.js"));
const header = "day,start,end,show,dj,description\n";
const csv = header + "Monday,08:00,10:00,Morning,Host,Music";
const url = "https://example.org/schedule.csv";
const success = async (body = csv) => ({ ok: true, text: async () => body });
function memoryStorage() {
  let value = null;
  return {
    getItem: async () => value,
    setItem: async (_, next) => {
      value = next;
    },
  };
}

test("Sheets CSV supports BOM, CRLF, reordered columns, commas, quotes and multiline descriptions", () => {
  const [show] = parseSchedule(
    '\uFEFFDJ,show,day,end,start,description\r\nHost,"Music, etc.",monday,2:00 PM,12:00 PM,"A ""quote""\nand another line"\r\n',
  );
  assert.equal(show.title, "Music, etc.");
  assert.equal(show.start, 720);
  assert.equal(show.end, 840);
  assert.equal(show.description, 'A "quote"\nand another line');
});

test("header-only feed is a valid empty schedule", () =>
  assert.deepEqual(parseSchedule(header), []));

test("reject malformed headers, quotes, rows, days, times, missing DJs and zero-duration shows", () => {
  for (const input of [
    "<html>Sign in</html>",
    "day,day,start,end,show,dj,description",
    header + 'Monday,08:00,10:00,"Unclosed,Host,Music',
    header + 'Monday,08:00,10:00,"Closed"oops,Host,Music',
    header + "Monday,08:00,10:00,Missing columns",
    header + "Funday,08:00,10:00,Show,Host,Music",
    header + "Monday,25:00,10:00,Show,Host,Music",
    header + "Monday,08:60,10:00,Show,Host,Music",
    header + "Monday,13:00 PM,10:00,Show,Host,Music",
    header + "Monday,08:00,08:00,Show,Host,Music",
    header + "Monday,08:00,10:00,Show,,Music",
  ])
    assert.throws(() => parseSchedule(input), Error);
});

test("sorts rows and permits adjacent shows", () => {
  const shows = parseSchedule(
    header +
      "Monday,10:00,12:00,Later,Host,Music\nMonday,08:00,10:00,Earlier,Host,Music",
  );
  assert.deepEqual(
    shows.map((s) => s.title),
    ["Earlier", "Later"],
  );
});

test("rejects overlaps within a day and across the weekly boundary", () => {
  assert.throws(
    () => parseSchedule(csv + "\nMonday,09:00,11:00,Other,Host,Music"),
    /overlapping/,
  );
  assert.throws(
    () =>
      parseSchedule(
        header +
          "Saturday,23:00,01:00,Late,Host,Music\nSunday,00:30,02:00,Early,Host,Music",
      ),
    /overlapping/,
  );
});

test("Central Time uses daylight saving rules rather than the phone timezone", () => {
  assert.deepEqual(stationClock(new Date("2026-07-06T13:00:00Z")), {
    day: 1,
    minute: 480,
  });
  assert.deepEqual(stationClock(new Date("2026-01-05T14:00:00Z")), {
    day: 1,
    minute: 480,
  });
  assert.deepEqual(stationClock(new Date("2026-07-06T05:00:00Z")), {
    day: 1,
    minute: 0,
  });
});

test("spring-forward and repeated fall-back hours follow station wall time", () => {
  assert.equal(stationClock(new Date("2026-03-08T07:59:00Z")).minute, 119);
  assert.equal(stationClock(new Date("2026-03-08T08:00:00Z")).minute, 180);
  assert.equal(stationClock(new Date("2026-11-01T06:30:00Z")).minute, 90);
  assert.equal(stationClock(new Date("2026-11-01T07:30:00Z")).minute, 90);
});

test("current-show range includes the start and excludes the end", () => {
  const [show] = parseSchedule(csv);
  assert.equal(isOnAir(show, new Date("2026-07-06T13:00:00Z")), true);
  assert.equal(isOnAir(show, new Date("2026-07-06T15:00:00Z")), false);
});

test("Saturday overnight shows appear on Sunday and remain scheduled through the week boundary", () => {
  const [show] = parseSchedule(header + "Saturday,23:00,01:00,Late,Host,Music");
  assert.equal(showsForDay([show], 0)[0].continues, true);
  assert.equal(showsForDay([show], 6)[0].continues, false);
  assert.equal(isOnAir(show, new Date("2026-07-05T05:30:00Z")), true);
  assert.equal(isOnAir(show, new Date("2026-07-05T06:00:00Z")), false);
});

test("midnight endings do not create a phantom next-day show", () => {
  for (const end of ["00:00", "24:00"]) {
    const shows = parseSchedule(
      header + `Saturday,23:00,${end},Late,Host,Music`,
    );
    assert.equal(showsForDay(shows, 0).length, 0);
  }
  assert.equal(formatTime(0), "12:00 AM");
  assert.equal(formatTime(720), "12:00 PM");
  assert.equal(formatTime(1440), "12:00 AM");
});

test("sample data is opt-in and an unconfigured production feed has no invented shows", async () => {
  const storage = memoryStorage();
  assert.equal(
    (await loadSchedule({ url: "", storage, allowDemo: true })).source,
    "demo",
  );
  assert.deepEqual(await loadSchedule({ url: "", storage }), {
    shows: [],
    source: "unconfigured",
  });
});

test("successful feed is cached and a failed refresh uses that saved copy", async () => {
  const storage = memoryStorage();
  const live = await loadSchedule({ url, storage, request: () => success() });
  assert.equal(live.source, "live");
  const cached = await loadSchedule({
    url,
    storage,
    request: async () => {
      throw new Error("offline");
    },
  });
  assert.equal(cached.source, "cache");
  assert.deepEqual(cached.shows, live.shows);
  assert.equal(cached.updatedAt, live.updatedAt);
});

test("invalid downloaded CSV never overwrites a good cache", async () => {
  const storage = memoryStorage();
  await loadSchedule({ url, storage, request: () => success() });
  const result = await loadSchedule({
    url,
    storage,
    request: () => success("<html>Sign in</html>"),
  });
  assert.equal(result.source, "cache");
  assert.equal(result.shows[0].title, "Morning");
});

test("storage write failure does not discard a successful download", async () => {
  const storage = {
    getItem: async () => null,
    setItem: async () => {
      throw new Error("full");
    },
  };
  assert.equal(
    (await loadSchedule({ url, storage, request: () => success() })).source,
    "live",
  );
});

test("empty feed replaces a previous cached schedule", async () => {
  const storage = memoryStorage();
  await loadSchedule({ url, storage, request: () => success() });
  await loadSchedule({ url, storage, request: () => success(header) });
  const result = await loadSchedule({
    url,
    storage,
    request: async () => ({ ok: false }),
  });
  assert.deepEqual(result.shows, []);
});

test("changed feed URLs, broken cache and first-load failures do not expose old or sample data", async () => {
  const storage = memoryStorage();
  await loadSchedule({ url, storage, request: () => success() });
  await assert.rejects(
    loadSchedule({
      url: url + "?new",
      storage,
      allowDemo: true,
      request: async () => ({ ok: false }),
    }),
    /Couldn’t load/,
  );
  await assert.rejects(
    loadSchedule({
      url,
      storage: { getItem: async () => "{broken", setItem: async () => {} },
      request: async () => ({ ok: false }),
    }),
    /Couldn’t load/,
  );
  await assert.rejects(
    loadSchedule({ url: "http://example.org", storage }),
    /HTTPS/,
  );
});
