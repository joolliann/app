# DJ schedule

Open **Schedule** beside the live indicator, or **Air Schedule** in the extras menu. Choose a day and tap a show to see its DJ and description. The player stays mounted while the schedule is open.

All show times use `America/Chicago`, including daylight saving time. Overnight shows appear under their start day and the following day as a continuation. “Scheduled now” reflects the timetable, not verified live studio activity. It is hidden for sample or cached data.

## Connect Google Sheets

Create a public-facing schedule tab with these exact column headers (order does not matter):

| day      | start | end   | show            | dj      | description                   |
| -------- | ----- | ----- | --------------- | ------- | ----------------------------- |
| Monday   | 08:00 | 10:00 | Your show title | DJ name | Short description or host bio |
| Saturday | 23:00 | 01:00 | Late-night show | DJ name | Continues into Sunday         |

Use full day names. Times can be `14:00` or `2:00 PM`; format the time columns as plain text to keep the CSV predictable. End times earlier than start times mean the next day; `00:00` or `24:00` can mark a midnight ending. Start and end must differ. Rows may not overlap. A blank description is allowed. A header-only sheet represents an empty schedule.

In Google Sheets, use **File → Share → Publish to web**, select only this tab and **Comma-separated values (.csv)**, then copy the published CSV URL. The ordinary editor/share link is not the feed. Publish only show information intended for listeners; the app does not need Google credentials.

Copy `.env.example` to `.env.local` and set:

```dotenv
EXPO_PUBLIC_SCHEDULE_CSV_URL=https://docs.google.com/spreadsheets/d/e/YOUR_PUBLISHED_ID/pub?gid=YOUR_TAB_ID&single=true&output=csv
```

Restart Metro after changing the environment variable. Include the same public variable in the build environment when packaging the app. This URL is bundled into the app; changing to a different sheet needs an updated app bundle. Editing rows in the same published sheet needs no code changes. Google may take time to republish changes; listeners fetch on opening the schedule or pulling to refresh.

Without a URL, development builds show clearly labeled examples. Release builds show an unavailable message and a link to the station website. Once configured, failed requests never fall back to sample shows. A previously valid copy is shown with its last-updated date; otherwise the app offers Retry. Invalid feeds and overlapping rows do not overwrite a valid cache.

## Work before you have the Mac

The schedule is TypeScript/React Native code; editing it and running its data tests does not require macOS. Use the repository's Yarn lockfile for dependency installation:

```sh
yarn install --frozen-lockfile
yarn test:schedule
yarn typecheck
```

The existing app includes native audio and other modules and uses an Expo development build, not ordinary Expo Go. See [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## On the Mac

Install Xcode and its iOS Simulator components. With Node and Yarn installed, clone this repo and check out the schedule branch. Set the public feed URL in `.env.local` before connecting real programming:

```sh
git clone https://github.com/joolliann/app.git
cd app
git checkout codex/dj-schedule
yarn install --frozen-lockfile
cp .env.example .env.local
yarn ios
# Later sessions with the development build already installed:
yarn start
```

`yarn ios` runs `expo run:ios` and performs a local native build; native dependency compatibility still needs checking on the Mac. The repo currently uses Expo SDK 52. This feature does not upgrade Expo or change the app's signing configuration. The existing EAS `development` profile targets the iOS simulator, not a physical iPhone. For a connected iPhone use `npx expo run:ios --device` with the required Xcode signing setup.

Before merging, verify on iOS (and Android when available):

- Open/close the schedule from both entry points while audio is playing; audio should continue and player controls should still work afterward.
- Select each day, open show details, use Back/Close and Android's hardware back button. Check small screens, large text, VoiceOver/TalkBack and both themes.
- Connect a real sheet, edit one row, then pull to refresh. Confirm the update is visible after Google republishes it.
- Load successfully, disable networking, then refresh/reopen. Confirm the dated saved-data notice. Clear app storage and retry offline to check the error/retry state.
- Confirm no sample shows appear in a release build without a configured feed.

## Automated checks

`yarn test:schedule` strictly compiles the data/parser modules and runs Node tests (Node 18 or newer) for CSV validation, time zones/DST, midnight/week boundaries, overlapping rows, empty feeds, and cache/network failures. It does not test native rendering or audio playback.
