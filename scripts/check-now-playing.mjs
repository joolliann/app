// Dev-only: verify the KJHK "now playing" data pipeline against the LIVE REST
// endpoint (the same one react-native uses for history). The app itself reads
// now-playing from a WebSocket at wss://api.kjhk.org/api/?target=metadata —
// see notes below. This script does NOT touch the app build (it's outside src/).
//
//   node scripts/check-now-playing.mjs            # current song + cover
//   node scripts/check-now-playing.mjs --watch    # poll every 15s
//
// What it mirrors from the app:
//   - transformStatus(data, true)        src/common/api/fetchNowPlaying.ts
//   - fetchCoverAndDuration(artist,track) src/common/api/fetchCover.ts

const REST = "https://kjhk.org/api/now-playing.php?q=";
const ITUNES = "https://itunes.apple.com/search?term=";
const DEEZER = "https://api.deezer.com/search?q=";
const BACKUP_IMG = "https://i.imgur.com/wX8S3kW.jpg";

const encode = (s) => encodeURIComponent(String(s)).replace(/%20/g, "+");

const request = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
};

// Same cover/duration resolution the app uses for the main (large) cover.
const fetchCoverAndDuration = async (artist, track, album) => {
  const term = `${encode(artist)}+${encode(track)}+${encode(album)}`;
  try {
    const [itunes, deezer] = await Promise.all([
      request(`${ITUNES}${term}&limit=1&entity=song`),
      request(`${DEEZER}${term}&limit=1`),
    ]);
    const i = itunes.results?.[0];
    const d = deezer.data?.[0];
    if (!i && !d) return { cover: BACKUP_IMG, duration: 0, albumDup: album };
    const coverUrl =
      d?.album?.cover_small ?? i?.artworkUrl60 ?? BACKUP_IMG;
    const cover = coverUrl.replace(/(\d+)x(\d+)/, "325x325");
    return {
      cover,
      duration: (d?.duration && d.duration * 1000) || i?.trackTimeMillis || 0,
      albumDup: d?.album?.title ?? i?.collectionName ?? album,
    };
  } catch (e) {
    return { cover: BACKUP_IMG, duration: 0, albumDup: album, error: String(e) };
  }
};

const cleanTitle = (t) =>
  t.replace(/ *\([^)]*\) */g, "").replace(/\[[^\]]*\]/g, "");

const fmtMSS = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
};

const transform = async (data) => {
  let { track, album, artist, length, timestampUTC } = data;
  const { cover, duration, albumDup, error } = await fetchCoverAndDuration(
    artist,
    track,
    album,
  );
  if (length === 0) length = duration;
  return {
    track: track?.length ? cleanTitle(track) : "Unknown Track",
    album: album?.length ? album : albumDup?.length ? albumDup : "Unknown Album",
    artist: artist?.length ? artist : "Unknown Artist",
    cover,
    coverFetchError: error ?? null,
    length: length / 1000,
    lengthHuman: length ? fmtMSS(length / 1000) : "--:--",
    timestampUTC,
    timestampLocal: new Date(timestampUTC).toLocaleString(),
  };
};

const line = () => console.log("─".repeat(72));

const showCurrent = async () => {
  try {
    const raw = await request(`${REST}1`);
    line();
    console.log("RAW from kjhk.org/api/now-playing.php?q=1");
    console.log(JSON.stringify(raw, null, 2));
    const transformed = await transform(raw);
    line();
    console.log("WHAT THE APP WOULD DISPLAY (nowPlayingAtom)");
    console.log("  track :", transformed.track);
    console.log("  album :", transformed.album);
    console.log("  artist:", transformed.artist);
    console.log("  length:", transformed.lengthHuman, `(${transformed.length}s)`);
    console.log("  time  :", transformed.timestampUTC, "→", transformed.timestampLocal);
    console.log("  cover :", transformed.cover);
    if (transformed.coverFetchError)
      console.log("  cover fetch error:", transformed.coverFetchError);
    line();
  } catch (e) {
    console.error("fetch failed:", e);
  }
};

const showHistory = async () => {
  try {
    const history = await request(`${REST}25`);
    line();
    console.log(`RECENTLY PLAYED (q=25, ${history.length} entries)`);
    for (const h of history.slice(0, 8))
      console.log(
        `  ${new Date(h.timestampUTC).toLocaleTimeString()}  ${h.artist} — ${h.track}  [${h.album}]`,
      );
    line();
  } catch (e) {
    console.error("history fetch failed:", e);
  }
};

// Quick liveness check of the sources the app depends on.
const checkSources = async () => {
  line();
  console.log("DATA SOURCE LIVENESS");
  const checks = [
    ["now-playing REST  https://kjhk.org/api/now-playing.php?q=1", `${REST}1`],
    ["Mixlr live status  https://api.mixlr.com/users/kjhk", "https://api.mixlr.com/users/kjhk"],
  ];
  for (const [label, url] of checks) {
    try {
      const j = await request(url);
      console.log(`  ✓ ${label}`);
      if ("is_live" in j) console.log(`     is_live = ${j.is_live}`);
    } catch (e) {
      console.log(`  ✗ ${label}  -> ${e.message}`);
    }
  }
  // WebSocket check (the source the app ACTUALLY uses for live updates)
  const wsURL = "wss://api.kjhk.org/api/?target=metadata";
  await new Promise((resolve) => {
    let done = false;
    const finish = (status) => {
      if (done) return;
      done = true;
      console.log(`  ${status} ${wsURL}`);
      resolve();
    };
    try {
      const ws = new WebSocket(wsURL);
      const t = setTimeout(() => {
        try { ws.close(); } catch {}
        finish("✗ (timeout)");
      }, 6000);
      ws.onopen = () => { clearTimeout(t); finish("✓ (connected)"); try { ws.close(); } catch {} };
      ws.onerror = () => { clearTimeout(t); finish("✗ (error)"); };
      ws.onclose = (e) => { clearTimeout(t); finish(`✗ (closed code=${e.code})`); };
    } catch (e) {
      finish(`✗ (threw: ${e.message})`);
    }
  });
  line();
};

(async () => {
  await checkSources();
  await showCurrent();
  await showHistory();

  if (process.argv.includes("--watch")) {
    console.log("\nWatching — Ctrl+C to stop\n");
    setInterval(showCurrent, 15000);
  }
})();
