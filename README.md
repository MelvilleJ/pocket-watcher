# Pocket Watcher

A household budget tracker: income, expenses, subscriptions, and debts, with monthly
budgeting (plan → lock → track actuals), a debt payoff roadmap, audit logging, and
multi-device sync between a web dashboard and an installable mobile app.

## Structure

- **`/` (this project)** — Next.js web dashboard: auth, summary charts, budget planning,
  debt roadmap, history/audit log, and the JSON API the mobile app syncs against.
- **`/mobile`** — Expo (React Native) app: offline-first local SQLite storage, syncs to
  the same Postgres backend, camera access reserved for future receipt-scanning OCR.

## Web app setup

1. **Database.** You need a Postgres server reachable at `DATABASE_URL` (see `.env`).
   Options:
   - Point `.env`'s `DATABASE_URL` at an existing Postgres server you already run.
   - `npm run db:up` / `npm run db:down` — Postgres via Docker Compose (requires Docker Desktop).
   - `npm run db:local` — runs a real Postgres server with no Docker/install required
     (via the `embedded-postgres` package); data lives in `.local-postgres-data/` (gitignored).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and a random `SESSION_SECRET`.
3. Create the database (if it doesn't exist yet) and apply the schema:
   ```bash
   npm run db:migrate
   ```
4. `npm run dev` and open http://localhost:3000.

Other DB scripts: `npm run db:generate` (generate a new migration after editing
`lib/db/schema.ts`), `npm run db:studio` (Drizzle Studio browser UI).

## Mobile app setup

```bash
cd mobile
npm install
npx expo start
```

- Press `a`/`i`/`w` to open on Android/iOS/web, or scan the QR code with Expo Go.
- On first login, open the **Settings** tab and set the **Server URL** to your computer's
  LAN IP (e.g. `http://192.168.1.23:3000`) — `localhost` only works in the iOS simulator,
  not on a physical device or Android emulator.
- Pull-to-refresh on the Summary tab (or "Sync now" in Settings) pushes local changes and
  pulls server changes.
- To produce a real installable app (not just Expo Go), see **Building an APK** below.

## Building an APK

The `preview` build profile in `mobile/eas.json` is set up to produce a directly-installable
`.apk` (rather than the Play Store `.aab` format):

```bash
cd mobile
npx eas login          # one-time, needs a free Expo account
npx eas build:configure # one-time, links this project to your Expo account
npx eas build --platform android --profile preview
```

This builds in Expo's cloud (free tier allows a limited number of builds/month) and gives you
a download link for the `.apk` when done — copy it to your phone and install it (you'll need to
allow "install from unknown sources" once). No Android Studio required.

If you'd rather build locally (no Expo account, but requires Android Studio + the Android SDK
installed): `npx expo run:android` from `/mobile` builds and installs a debug APK directly to a
connected device or emulator.

Either way, after installing, open the app's **Settings** tab and point **Server URL** at
wherever your Postgres-backed web app is actually reachable (your computer's LAN IP for local
testing, or a deployed URL) — it defaults to `http://localhost:3000`, which only resolves from
the device itself, not your dev machine.

## Offline behavior

The mobile app is local-first: once you've logged in **at least once with connectivity**, the
session token and your profile are cached on-device, and the app stays usable fully offline —
all reads/writes go to the local SQLite database regardless of network state, and a "You're
offline" banner shows on the Summary tab. Data syncs to the server next time you're online
(pull-to-refresh or "Sync now" in Settings).

**Logging in for the very first time on a device requires connectivity** — there's no way to
create or verify an account without reaching the server at least once, same as any account-based
app. After that, closing/reopening the app or losing signal will not sign you out: the app only
force-logs-out a device when the server explicitly rejects the token (e.g. you signed out that
device remotely from Settings → Active sessions), never just because it couldn't be reached.

## Tech notes

- **Backend:** Next.js 16 App Router, Drizzle ORM, PostgreSQL. Auth is a custom
  JWT-backed session (cookie for web, bearer token for mobile) with a `sessions` table
  for revocation/device history and an `audit_logs` table recording every create/update/
  delete with before/after snapshots.
- **Sync protocol:** `/api/mobile/sync` — `GET ?since=<ISO date>` pulls rows changed after
  that cursor (including tombstones for deletes); `POST` pushes local changes keyed by a
  client-generated UUID (`clientId`), upserted server-side.
- **Charts:** Recharts, following a validated categorical/sequential color system for
  light and dark mode.
