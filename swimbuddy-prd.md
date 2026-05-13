# Swimbuddy — Product Requirements Document

**Version:** 1.0 (Prototype → MVP)
**Owner:** Buddhi
**Last updated:** May 13, 2026
**Status:** Draft for MVP build

---

## 1. Overview

### 1.1 What is Swimbuddy?

Swimbuddy is a mobile-first app for logging swimming practice sessions, with first-class support for **drill timing** and **Individual Medley (IM)** sum calculation. The primary user is a **swim coach** (or self-coaching swimmer) who runs structured pool sessions and wants a fast way to record times per drill, group drills into meaningful sets (e.g., a full IM attempt), and review progress over time.

### 1.2 The problem

Coaches today juggle a stopwatch, a clipboard, and mental math. Recording four 25M IM splits and summing them is fiddly. Tracking which times belong to which "attempt" or "set" is error-prone. There's no clean record across sessions.

### 1.3 The solution

A purpose-built app where:

1. Each practice day is a **session**.
2. Each timed swim is a **drill** (stroke + distance + time + optional label).
3. Drills can be selected and summed on the fly, or saved as a named **group** (e.g., "IM Attempt 1", "Complex 15+5+5+15").
4. All sessions are listed by date and can be opened, reviewed, and edited.

### 1.4 Out of scope (v1)

- Real-time stopwatch integration with sensors or wearables
- Multi-athlete tracking (this is a single-user app first)
- Training plan generation or AI coaching
- Pace zones, heart rate, or stroke count
- Social/sharing features (beyond export)
- Yards (meters only for v1)

---

## 2. Users & use cases

### 2.1 Primary user

**Coach during pool deck.** Phone in hand, stopwatch around neck. Shouts times to themselves or has them shouted. Needs to log fast, with as few taps as possible.

### 2.2 Secondary user

**Self-coaching swimmer.** Records their own drills between sets. Reviews progress weekly.

### 2.3 Core use cases

| # | Use case | Frequency |
|---|---|---|
| UC1 | Log an individual drill (e.g., 25M Butterfly, 18.45s) | Every set, many times per session |
| UC2 | Sum the last N drills to see total IM time | A few times per session |
| UC3 | Save a sum as a named group ("IM Attempt 1") | 1–3 times per session |
| UC4 | Edit a drill that was entered wrong | Occasional |
| UC5 | Open yesterday's session to compare | Weekly |
| UC6 | Start a fresh session for today's practice | Per practice day |
| UC7 | Export session history (e.g., for analysis or backup) | Monthly |
| UC8 | Sync data to cloud so it survives device loss | Continuous, after first setup |

---

## 3. Data model

```
Session {
  id: string (uuid)
  date: ISO date (YYYY-MM-DD)
  notes: string
  drills: Drill[]
  groups: Group[]
  createdAt: ISO timestamp
  updatedAt: ISO timestamp
}

Drill {
  id: string (uuid)
  strokeId: 'fly' | 'back' | 'breast' | 'free' | 'mixed'
  distance: number (meters, positive integer)
  timeCs: number (centiseconds — e.g., 30.45 sec = 3045)
  label: string (optional, free text)
  createdAt: ISO timestamp
}

Group {
  id: string (uuid)
  name: string (e.g., "IM Attempt 1")
  drillIds: string[] (ordered references to Drill.id)
  createdAt: ISO timestamp
}
```

**Constraints:**

- A drill belongs to **at most one** group per session.
- Deleting a drill removes its reference from any group; if a group ends up with fewer than 2 drills, the group is auto-deleted.
- Times are stored as centiseconds (integers) to avoid floating-point drift. Format only at display time.
- Session date is the **practice date**, not the creation timestamp (a coach can backfill a session for yesterday).

---

## 4. Features (MVP)

### 4.1 Home screen — Session list

- Reverse-chronological list of all sessions.
- Each session card shows: date, drill count, group count, total time across all drills, and the best (lowest) saved group with a ★.
- Floating **+** button creates a new session dated **today**.
- Empty state with a friendly prompt to create the first session.

### 4.2 Session screen — Drills and groups

**Layout (top to bottom):**

1. Header: back button, date (long format), three-dot menu (delete session).
2. **Groups section.** Each group is a cyan container with name + total time, and the drills inside it are nested in a white inner card. Groups are collapsible. The X on a group header ungroups it (drills survive and move to the ungrouped list).
3. **Ungrouped drills section.** A flat list of drills not in any group. Each drill has a select checkbox for building new groups.
4. **+ Add drill** floating button (when no selection is active).

**Selection behavior:**

- Only ungrouped drills are selectable for building new groups (prevents the confusion of a drill being in two groups).
- When 2+ drills are selected, a dark bottom bar appears showing the running sum and a "Save as group" button.
- Save prompts for a name, then promotes the selection to a new group.

**Per-drill actions (ungrouped):**

- Edit (opens drill sheet pre-filled)
- Delete (immediate, with implicit undo via re-add)

**Per-drill actions (grouped):**

Tap the row to reveal an inline action drawer:
- Edit
- Remove from group (drill stays in session, moves to ungrouped)
- Delete drill

### 4.3 Drill entry sheet

A bottom sheet for adding or editing a drill. Fields:

- **Stroke** — pill buttons: Butterfly, Backstroke, Breaststroke, Freestyle, Mixed. (Mixed is for complex drills like "15+5+5+15" that don't fit a single stroke.)
- **Distance** — chip buttons: 5M, 15M, 25M, 50M, Custom. Custom reveals a numeric input.
- **Time** — large display showing `MM:SS.cc`. User types digits only; app formats from the right. Example: typing `3045` → `00:30.45`. Backspace deletes one digit. Hidden text input captures keystrokes; the visible display is styled large.
- **Label** (optional) — free text. Examples: "first try", "sprint", "after kick set".

Save button is disabled until a positive time and positive distance are set.

### 4.4 New session

Tap **+** on home screen. Creates a session with `date = today`. Opens directly to the (empty) session screen. User can edit the date via the three-dot menu (future: backfill yesterday's session if forgotten).

### 4.5 Delete session

From the three-dot menu in the session header. Shows a confirmation dialog before deletion. No soft-delete or restore in v1.

---

## 5. Local persistence

### 5.1 Local store (offline-first foundation)

All data is mirrored locally on the device. The UI reads from and writes to the local store first; the server is synced behind it (see Section 7.4). The app must work fully offline after first sign-in.

| Platform | Local store |
|---|---|
| Web (PWA) | **IndexedDB** via Dexie.js (5KB gzipped wrapper) |
| iOS / Android (Expo) | **SQLite** via `expo-sqlite` |

Both are wrapped behind a single `localDB` module exposing the same async API: `getAll()`, `get(id)`, `put(record)`, `delete(id)`, `queueMutation(op)`, `flushMutations()`. Callers don't know which backend is in use.

**Why not AsyncStorage?**
AsyncStorage is fine for small key-value data but doesn't scale well past a few hundred KB on web, and offers no query capability. IndexedDB and SQLite let us index by date, filter by user, and handle the mutation queue cleanly.

### 5.2 Local tables

- `sessions` — full session records, including drills and groups (mirrors the server schema).
- `mutation_queue` — pending writes not yet sent to the server. Each entry: `{ id, op, payload, ts, retries }`.
- `meta` — singleton row: last sync timestamp, current user info, app version.

### 5.3 Data safety

- Every user action (add drill, edit, delete, save group) writes to the local store **before** the UI reflects success — failed writes show an error, never silent.
- A 250ms debounce coalesces rapid edits, but the store flushes immediately on `visibilitychange` (web) or `AppState` background (native).
- On app start, the entire `sessions` table loads into memory for fast list rendering. Reactivity is via React state.
- The mutation queue is processed by a background flush loop (see Section 7.4).

---

## 6. Export

### 6.1 What can be exported

The user can export **all sessions** (full backup) or **a single session** (share with athlete, coach, etc.).

### 6.2 Formats

| Format | Use case | Priority |
|---|---|---|
| **Excel (.xlsx)** | One-click open in Excel / Google Sheets with formatting, multiple sheets, totals | P0 |
| **CSV** | Lightweight, universal, scriptable for analysis | P0 |
| **JSON** | Full fidelity backup; can be re-imported | P0 |
| **Plain text** | Quick share via WhatsApp / SMS | P1 |

Excel is the **primary user-facing export** since it's the most useful for coaches who want to look at the data later. CSV and JSON are for power users and backup.

### 6.3 CSV schema

One row per drill:

```
session_date, session_id, drill_index, stroke, distance_m, time_seconds, time_display, label, group_name
2026-05-13, s1, 1, Butterfly, 25, 18.45, 00:18.45, , IM Attempt 1
2026-05-13, s1, 2, Backstroke, 25, 22.10, 00:22.10, , IM Attempt 1
2026-05-13, s1, 3, Breaststroke, 25, 25.40, 00:25.40, , IM Attempt 1
2026-05-13, s1, 4, Freestyle, 25, 16.20, 00:16.20, , IM Attempt 1
2026-05-13, s1, 5, Freestyle, 50, 39.20, 00:39.20, cooldown, 
```

- `time_seconds` is a decimal for spreadsheet math.
- `time_display` is the formatted `MM:SS.cc` for readability.
- `group_name` is blank for ungrouped drills.

### 6.4 Excel (.xlsx) format

Generated client-side using **SheetJS** (`xlsx` package, ~250KB gzipped). One workbook contains:

- **Sheet 1: "Sessions"** — one row per session with date, drill count, group count, total time, best group name & time.
- **Sheet 2: "Drills"** — flat list of every drill across all sessions with the columns from §6.3, plus a `group_name` column. Sortable and filterable in Excel.
- **Sheet 3: "Groups"** — every saved group with its session date, name, drill count, and total time.

Cells use proper types: dates are real Excel dates, times are decimal seconds (formatted as `mm:ss.00` in display), counts are integers. This means Excel pivot tables, charts, and formulas all "just work" without re-typing.

Filename: `swimbuddy-export-YYYY-MM-DD.xlsx`

### 6.5 Plain text format

```
Swimbuddy — Today (Wed, May 13)
─────────────────────────────

★ IM Attempt 1 — 01:22.15
  Fly   25M   00:18.45
  Back  25M   00:22.10
  Brst  25M   00:25.40
  Free  25M   00:16.20

Ungrouped:
  Free  50M   00:39.20  (cooldown)

Total: 02:01.35
```

### 6.6 Export mechanism

**On native (iOS/Android)** — use `expo-sharing` + `expo-file-system`:

1. Generate the export content as a string.
2. Write it to a temp file in `FileSystem.cacheDirectory`.
3. Call `Sharing.shareAsync(uri, { mimeType, dialogTitle })`.
4. iOS/Android share sheet appears — user picks destination (Files, Drive, AirDrop, Mail, WhatsApp, etc.).

This gives "save to Google Drive" for free via the native share sheet, with zero extra integration.

**On web** — `expo-sharing` is not available. Use the standard browser download pattern:

1. Generate the export content as a string.
2. Create a `Blob` and an object URL: `URL.createObjectURL(blob)`.
3. Create a hidden `<a>` with `download="swimbuddy-export.json"`, click it, revoke the URL.

Wrap both behind a single `exportFile(content, filename, mimeType)` function that branches on `Platform.OS === 'web'`. Callers don't need to know.

### 6.7 Import

For v1, only JSON re-import is supported. User taps an `.swimbuddy.json` file from their files app; the OS hands it to Swimbuddy via deep linking. App shows a confirmation dialog: "Import N sessions? This will replace your current data." (Merge is a v2 problem.)

---

## 7. Authentication & cloud sync

### 7.1 Requirements

- **Google SSO** to sign in (one tap, no passwords).
- **Local-first**: every action persists locally before hitting the network. App is fully usable offline after first sign-in.
- **Sync on reconnect**: pending changes flush automatically when connectivity returns.
- **Survives device loss**: sign in on a new device → all sessions appear.
- **Cost-conscious**: serverless, scales to zero, low cost even with hundreds of users.
- **User owns their data**: Excel/CSV/JSON export at any time, no lock-in.

### 7.2 Auth: Google Sign-In

Use **Google OAuth 2.0** with the OpenID Connect (`openid email profile`) scopes only — no Drive scope, no Gmail scope. The app just needs to know **who** the user is.

| Layer | Implementation |
|---|---|
| Web (PWA) | Google Identity Services (GIS) JavaScript library — One Tap and Sign-In With Google button |
| iOS/Android (native) | `expo-auth-session` with the Google provider, using ID tokens |
| Backend verification | Cloudflare Worker verifies the Google ID token against Google's JWKs (`https://www.googleapis.com/oauth2/v3/certs`) |
| Session | After verification, the Worker issues an HTTP-only secure cookie (web) or returns a signed session JWT (native) |

**No client secret needed.** Google ID tokens are JWTs the client receives directly from Google; the backend just verifies them with Google's public keys. No token exchange round-trip, no secret storage on the client.

**Sign-in policy (TBD — see Open Question #7).**
- **Option A**: Sign-in required to use the app. Simpler. Pick if Swimbuddy is built mainly for known users.
- **Option B**: Local-only "guest mode" allowed; sign in to enable sync. Strangers can try the app without committing.

### 7.3 Backend: Cloudflare Workers + D1

A single Cloudflare Worker handles the API. Stored data lives in **Cloudflare D1** (SQLite at the edge).

**Schema:**

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Google `sub` claim
  email TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- client-generated UUID
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,               -- YYYY-MM-DD
  notes TEXT DEFAULT '',
  data JSON NOT NULL,               -- {drills: [...], groups: [...]}
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,                  -- soft delete for sync safety
  client_version INTEGER NOT NULL DEFAULT 0  -- for optimistic concurrency
);

CREATE INDEX idx_sessions_user_updated ON sessions(user_id, updated_at);
CREATE INDEX idx_sessions_user_date ON sessions(user_id, date DESC);
```

**Why store `data` as JSON?** Drills and groups inside a session are accessed together, change together, and the per-session payload is tiny (~2KB even for a long session). Flattening to separate tables adds query complexity for zero benefit at this scale. Re-normalize in v2 if analytics demand it.

**Endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/google` | Verify Google ID token, create/update user, issue session |
| `POST` | `/auth/logout` | Clear session |
| `GET` | `/sync?since={timestamp}` | Fetch sessions changed since timestamp (server's source of truth) |
| `POST` | `/sync` | Push a batch of local mutations (ops queue) |
| `DELETE` | `/account` | Delete all user data |

**Free tier headroom:** D1 free tier allows 5M reads/day and 100K writes/day. Workers free tier gives 100K requests/day. A single coach generating 50 sessions/year × 20 drills/session × 2 writes per mutation = ~2,000 writes/year. Headroom is effectively infinite.

### 7.4 Offline-first sync model

**Local store: IndexedDB on web, SQLite on native.**

On web, use **Dexie.js** as a thin IndexedDB wrapper (5KB gzipped). On native, use `expo-sqlite`. Both expose the same async key-value-ish API behind a single `localDB` abstraction layer. The same code path reads and writes regardless of platform.

**Three local tables:**

1. `sessions` — mirrors the server schema; the source of truth for the UI.
2. `mutation_queue` — pending writes not yet sent to the server.
3. `meta` — last sync timestamp, user info, etc.

**The lifecycle of a drill add (online):**

1. User taps "Add drill" → optimistic write to local `sessions` table.
2. UI updates instantly (zero network latency perceived).
3. The mutation `{ op: 'add_drill', sessionId, drill, ts }` is appended to `mutation_queue`.
4. A debounced flush (2s) sends the queue to `POST /sync`.
5. Server applies, returns the canonical updated_at; client clears queue entries with matching ids.

**The lifecycle of a drill add (offline):**

1. Steps 1–3 same as online.
2. Queue flush fails (network error).
3. **On web**, register a Background Sync event with the service worker — the browser will retry when connectivity returns, even if the user closed the tab.
4. **On native**, listen to `NetInfo` connectivity events and flush when back online.
5. UI shows a subtle "X pending" badge in the sync indicator.

**Conflict resolution (per-session last-write-wins):**

- Each session has a server-side `client_version` integer.
- Client sends mutations with the version it last saw.
- If server's version is higher (another device wrote first), server returns a conflict response with the current server state.
- Client applies a merge strategy: **drills are merged by ID** (additive), **edits to the same drill use the higher updated_at**, **deletions win** (a deleted drill stays deleted).

For v1, this is simple enough to ship. The realistic conflict case for a single coach is rare (same session edited on two devices in quick succession). The PWA on a single browser tab won't see conflicts at all.

### 7.5 Background Sync on web

The **Background Sync API** lets the service worker retry failed network requests when connectivity returns, even after the user closes the tab. This is the PWA equivalent of Android's WorkManager.

```js
// In the app, when a mutation fails to send
await registration.sync.register('flush-mutations');

// In the service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-mutations') {
    event.waitUntil(flushQueueToServer());
  }
});
```

**Caveat**: Background Sync isn't supported on Safari/iOS (Chrome/Edge/Android only). For Safari users, fall back to flushing on next app open + a `visibilitychange` listener that retries when the tab returns to focus. Works reliably for the coaching use case.

### 7.6 Sync UI

- **Sign-in screen** on first launch (or in Settings if guest mode is allowed).
- **Sync indicator** in the home header: cloud icon with a small status dot.
  - Green dot: all changes synced.
  - Amber pulse: syncing now.
  - Grey: offline, N changes pending.
  - Red: error, tap for details.
- **Settings → Account**: name, email, "Sign out", "Delete account".
- **Settings → Storage**: "Last synced: 2 min ago", "Sync now" button, "X pending changes".

### 7.7 Security & privacy

- All API requests require a valid session cookie (web) or JWT (native).
- Cookies are `HttpOnly`, `Secure`, `SameSite=Lax`.
- D1 row-level isolation by `user_id` — every query is scoped, no cross-user reads.
- TLS everywhere (Cloudflare default).
- "Delete account" action wipes all user data within 30 days (soft-deleted immediately, hard-purged on a scheduled Worker cron).
- No analytics, no third-party tracking, no ads.

### 7.8 Why this beats Google Drive sync

| Concern | Google Drive (previous plan) | Cloudflare D1 + Workers |
|---|---|---|
| User consent prompt | "App wants access to its own Drive folder" — sounds scary | "Sign in with Google" — universally familiar |
| Conflict handling | Full-file overwrite, hard to merge | Per-session, mergeable |
| Multi-device | Cumbersome with full-file writes | Built in |
| Backend control | None (Google's quotas, API changes) | Full ownership |
| Cost | $0 | $0 at this scale, ~$5/month if it grows |
| Export portability | Drive JSON only | Excel, CSV, JSON — multiple formats |
| Future analytics | Hard (data is in user's Drive) | Trivial (data is in your D1) |

---

## 8. Non-functional requirements

### 8.1 Platform

Swimbuddy targets **three platforms from one codebase** using Expo's universal app model:

- **iOS** 15+ (App Store)
- **Android** 10+ (Play Store)
- **Web** (Cloudflare Pages — see Section 9.5)

Built on Expo SDK 51+ with React Native 0.74+ and `react-native-web` for browser rendering. All UI is written using React Native primitives (`View`, `Text`, `Pressable`, `TextInput`) which `react-native-web` translates to HTML/CSS at build time.

The prototype's component structure ports cleanly: `div → View`, `button → Pressable`, `input → TextInput`, `lucide-react → lucide-react-native` (works on web too).

**Platform-specific code is isolated.** Use `Platform.OS === 'web'` branches or `.native.ts` / `.web.ts` file suffixes for the small set of features that differ between platforms — storage, sharing, OAuth redirect handling, deep linking.

### 8.2 Performance

- Cold start under 2 seconds on a mid-range Android (Pixel 4a class).
- Adding a drill, including persistence, must complete in under 100ms perceived latency.
- List view should remain smooth at 60fps with 500+ sessions (use `FlatList`, not `ScrollView` with `.map()`).

### 8.3 Offline behavior

- All features (except cloud sync) work fully offline.
- Cloud sync queues changes locally and replays them when connectivity returns.

### 8.4 Accessibility

- Touch targets ≥ 44pt.
- VoiceOver / TalkBack labels on all interactive elements.
- Text must be readable at the OS's largest accessibility text size — layouts should reflow, not truncate.
- High contrast: the cyan-on-cyan group containers pass WCAG AA at 14pt and above.

### 8.5 Internationalization

- v1: English only.
- Times always shown as `MM:SS.cc`. Dates use the device locale.
- Distance is always meters.

### 8.6 Privacy

- No analytics, no third-party SDKs in v1.
- If cloud sync is enabled, only the user's own Google account holds the data.
- A "Delete all data" action in settings (clears AsyncStorage and the Drive appData file).

---

## 9. Web build & hosting

### 9.1 Why web matters

A web build unlocks several real benefits for Swimbuddy's audience:

- **No app store friction.** Coaches can open the URL on a poolside iPad, phone, or laptop without installing anything.
- **Faster iteration.** Push to deploy in seconds; no app review queue for prototype tweaks.
- **Free hosting on Cloudflare.** Static export → Cloudflare Pages → zero cost, global CDN, automatic HTTPS, preview URLs per branch.
- **Same codebase as native.** No duplicate effort.

### 9.2 Build mechanics

Expo produces a static web bundle via:

```bash
npx expo export --platform web
```

This emits a `dist/` folder containing `index.html`, JS chunks, CSS, and static assets. Everything is fully static — no Node.js runtime required to serve it. The build uses **Metro** (Expo's default bundler) or optionally **Webpack** with `react-native-web` resolving native modules to web equivalents.

### 9.3 Cloudflare Pages deployment

**Recommended hosting target.**

| Setting | Value |
|---|---|
| Build command | `npx expo export --platform web` |
| Build output directory | `dist` |
| Node version | 20.x |
| Framework preset | None (custom) |

**Workflow:**

1. Push code to GitHub.
2. Cloudflare Pages auto-builds and deploys on every push.
3. Production branch (`main`) → `swimbuddy.pages.dev` (or custom domain).
4. Feature branches get preview URLs automatically.

**Free tier limits:** 500 builds/month, unlimited bandwidth, unlimited requests. Well beyond Swimbuddy's needs.

### 9.4 Platform-specific code paths

The features that differ on web are isolated behind a thin abstraction layer:

| Feature | Native (iOS/Android) | Web |
|---|---|---|
| Local DB | `expo-sqlite` | `IndexedDB` via Dexie.js |
| Export file | `expo-sharing` + native share sheet | `Blob` + hidden `<a download>` click |
| Auth | `expo-auth-session` Google ID token | Google Identity Services (GIS) ID token |
| Session storage | JWT in `expo-secure-store` (Keychain / Keystore) | `HttpOnly` secure cookie set by the API |
| Deep links | `expo-linking` URL schemes | URL paths + `window.history` |

Each capability lives in its own module with a single public function whose signature is identical across platforms. Use `Platform.OS === 'web'` branches or `.native.ts` / `.web.ts` file resolution.

### 9.5 OAuth on web — Google ID token flow

The web app uses **Google Identity Services (GIS)** for sign-in — the modern replacement for the old gapi/Sign-In-With-Google library:

1. Load the GIS script: `<script src="https://accounts.google.com/gsi/client" async defer></script>`.
2. Render a Sign-In With Google button (or use One Tap for returning users).
3. GIS returns a **Google ID token** (JWT) to the client.
4. Client POSTs the ID token to `https://api.swimbuddy.pages.dev/auth/google`.
5. The Cloudflare Worker verifies the JWT against Google's public keys, creates or updates the user row in D1, and sets an `HttpOnly` session cookie.
6. Subsequent API calls send the cookie automatically.

**Google Cloud Console setup:**

- OAuth 2.0 Client ID type: **Web application**
- Authorized JavaScript origins:
  - `http://localhost:8081` (dev)
  - `https://swimbuddy.pages.dev` (prod)
  - `https://<custom-domain>` (if used)
- Scopes: `openid email profile` only. **No Drive scope, no Gmail scope.**

**No client secret needed** for ID token verification. The server uses Google's public JWKs to verify; no token-exchange round-trip.

For native, `expo-auth-session` uses the same ID token approach with the Google provider — the Worker accepts the token from either source.

### 9.6 Progressive Web App (PWA)

PWA support is **part of v1**, not a v1.1 addition, because it's central to the offline sync story.

- Standalone window (no browser chrome)
- Custom app icon, splash screen
- Offline support via service worker
- Background Sync API for resilient mutation queue
- Future: push notifications for scheduled practices

**Implementation:**

1. Add a Web App Manifest (`manifest.webmanifest`) with icons, theme color, display mode.
2. Add a service worker using **Workbox** for clean cache strategies:
   - **App shell** (HTML, JS, CSS): cache-first with versioned invalidation.
   - **API calls** (`/sync`, `/auth/*`): network-first, with fallback to the local queue.
   - **Static assets**: stale-while-revalidate.
3. Register a `sync` handler for the `flush-mutations` tag (Section 7.5).

Expo's web build supports PWA out of the box with minor config; expand if needed.

### 9.7 Responsive layout

The current prototype is designed for a 390pt mobile viewport. On desktop browsers, the same layout would stretch awkwardly. Two options:

1. **Phone-frame layout on desktop** (v1) — center the mobile layout at its native width, with a dark background fill. Mirrors how the prototype already looks. Acceptable for a coaching tool that's mostly used on phones anyway.
2. **Responsive layout** (v1.1+) — use CSS media queries (via `useWindowDimensions`) to switch to a two-pane layout on tablet/desktop: session list on left, session detail on right.

Start with option 1. Revisit when desktop usage actually emerges.

### 9.8 Performance on web

- First Contentful Paint < 1.5s on a 4G connection.
- Time to Interactive < 3s.
- Bundle size budget: < 400KB gzipped for the initial JS.
- Use Expo's bundle splitting; lazy-load the drill entry sheet and settings screen.

---

## 10. Tech stack

### 10.1 Client

| Layer | Choice |
|---|---|
| Framework | Expo (managed) — universal iOS / Android / Web |
| Language | TypeScript |
| State | React `useState` / `useReducer` (no Redux; data is small enough) |
| Local DB | `expo-sqlite` (native), Dexie.js / IndexedDB (web) — behind a unified `localDB` module |
| Auth | `expo-auth-session` Google provider (native); Google Identity Services (web) |
| Session storage | `expo-secure-store` (native); `HttpOnly` cookie set by API (web) |
| Export | SheetJS (`xlsx`) for Excel; native CSV/JSON/text; `expo-sharing` (native) + Blob (web) |
| PWA | Workbox-generated service worker + Web App Manifest |
| Icons | `lucide-react-native` |
| Navigation | `@react-navigation/native` (stack: Home → Session) |
| Date formatting | `date-fns` |
| Testing | Jest + React Native Testing Library |

### 10.2 Backend (Cloudflare)

| Layer | Choice |
|---|---|
| API runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite at the edge) |
| Hosting (static SPA) | Cloudflare Pages |
| Auth verification | Google ID token JWT verification against `https://www.googleapis.com/oauth2/v3/certs` |
| API framework | Hono (lightweight Worker-native routing) |
| ORM / migrations | `drizzle-orm` with D1 driver |
| Deployment | Wrangler CLI, push-to-deploy from GitHub |

### 10.3 Project structure

```
swimbuddy/
├── app/                    # Expo Router screens
│   ├── _layout.tsx
│   ├── index.tsx           # Home (session list)
│   ├── session/[id].tsx    # Session detail
│   └── settings.tsx
├── components/             # Shared UI components
├── lib/
│   ├── localDB/
│   │   ├── index.ts        # Unified API
│   │   ├── native.ts       # expo-sqlite impl
│   │   └── web.ts          # Dexie impl
│   ├── sync/
│   │   ├── client.ts       # Mutation queue, flush logic
│   │   └── conflicts.ts    # Merge strategies
│   ├── auth/
│   │   ├── google.native.ts
│   │   └── google.web.ts
│   ├── export/
│   │   ├── excel.ts
│   │   ├── csv.ts
│   │   ├── json.ts
│   │   └── share.ts        # Platform-branching share
│   └── time.ts             # Time formatting utilities
├── api/                    # Cloudflare Worker (separate package or sibling repo)
│   ├── src/
│   │   ├── index.ts        # Hono app entry
│   │   ├── routes/
│   │   ├── db/             # D1 schema + queries
│   │   └── auth/           # ID token verification
│   └── wrangler.toml
└── public/                 # PWA manifest, icons
```

---

## 11. Roadmap

### v0.x — Prototype (✓ done)

Web-based React prototype to validate UX. Done.

### v1.0 — MVP

Goal: end-to-end working app on web + Cloudflare backend, ready to use on poolside.

- Expo project scaffolded for iOS / Android / Web
- Local SQLite (native) and IndexedDB (web) via unified `localDB` module
- Cloudflare Worker API with D1 schema, deployed to Workers
- Google Sign-In on web (GIS) and native (`expo-auth-session`)
- Cloudflare-side ID token verification, session cookies
- Offline-first mutation queue with Background Sync (web) / NetInfo (native)
- PWA manifest + service worker, installable on phone
- Cloudflare Pages deployment with custom domain (optional)
- Excel / CSV / JSON export
- Settings screen with account info, sign out, delete account
- Basic accessibility

### v1.1 — Polish

- Edit session date (backfill yesterday)
- Session notes field
- Search by date or stroke
- Group rename
- Reorder drills within a session (long-press drag)
- Responsive desktop layout (two-pane: list + detail)
- Import from JSON (restore from export)

### v2.0 — Analysis & richer sync

- Trend charts: best 50M Free over time, IM total over time
- Per-stroke PR tracking
- Tag system (sets, drills, races)
- Custom strokes & distance presets
- Real-time multi-device sync (if needed) via Durable Objects or WebSockets
- Multi-user support if validated by demand

### Future / explore

- Apple Watch / Wear OS companion for stopwatch capture
- Pool length presets (25m / 50m)
- Web push notifications for scheduled practices
- Coach view with multiple athletes (would need a roles model in D1)

---

## 12. Open questions

1. **Sign-in policy — required or optional?** (Critical for v1.) Option A: sign-in required to use the app at all. Option B: local-only "guest mode" allowed; sign in promotes guest data to a synced account. Pick before scaffolding auth.
2. **Date format on home cards.** Should past dates show "Yesterday", "2 days ago", or just "Mon, May 12"? Current prototype uses the latter; consider mixing relative + absolute for the last 7 days.
3. **Session timezone.** A session created at 11:55 PM in Colombo and synced at 12:05 AM UTC — does the date "stick"? Recommendation: store the `date` as a plain `YYYY-MM-DD` string with no timezone, set from device-local time at creation.
4. **D1 quota planning.** Free tier is generous, but at ~$5/month a paid plan handles meaningful scale. Worth deciding the cost cap before launch.
5. **Custom domain.** Use `swimbuddy.pages.dev` for v1, or buy `swimbuddy.app` / similar? Custom domain takes 10 minutes to set up on Cloudflare and looks more credible.
6. **Multi-pool / multi-coach.** Out of scope for v1, but worth confirming there's no plan to support it before locking the schema. If yes, add a `coachId` and `poolId` later via migration.
7. **Pool length.** Some drills are tied to pool length (a "25M" in a 50M pool means one length; in a 25M pool it means a there-and-back). Probably doesn't matter for time logging, but worth noting.
8. **iOS Safari Background Sync limitation.** Safari doesn't support Background Sync API. The fallback (flush on next foreground + `visibilitychange`) is acceptable for coaching use, but worth confirming via testing on actual iOS Safari before launch.
9. **Account deletion timeline.** Soft-delete immediately, hard-purge after how long? 30 days is the proposed default — confirm this is acceptable from a privacy/regulatory perspective.

---

## 13. Success metrics

- Time to log one drill (from "I have a time" to "saved"): **under 8 seconds** including the stroke / distance / time taps.
- Sessions can be exported and re-imported with **zero data loss** (round-trip test).
- Cloud sync recovers a full backup on a fresh device in **under 30 seconds**.
- Web First Contentful Paint < 1.5s on a 4G connection.
- App store rating ≥ 4.5 (vanity metric, but useful for coaching tools where trust matters).

---

*This PRD is a living document. Edit as you build.*
