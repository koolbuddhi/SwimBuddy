# Spec: SwimBuddy v1.0 MVP

**Status:** Approved — ready for planning & implementation  
**Last updated:** 2026-05-13  
**Owner:** Buddhi

---

## Objective

Build a mobile-first, offline-capable PWA + native app for logging swimming practice sessions.
Coaches and self-coaching swimmers type drill times (stroke, distance, centiseconds), sum selected drills on the fly into named groups (e.g. "IM Attempt 1"), and review history across sessions.

**Primary user:** Coach on a pool deck, phone in hand. Needs to log one drill in under 8 seconds.

**Success looks like:**
- A coach can start a new session, log four IM splits, sum them into a group, and close the app — all in under 90 seconds on first use, no tutorial needed.
- The app works offline all day; changes sync silently when connectivity returns.
- Data survives a lost device: sign in on a new phone and all sessions appear.

---

## Confirmed Decisions (from PRD open questions)

| Question | Decision |
|---|---|
| Sign-in policy | **Required** — no guest mode in v1. Simpler auth + data ownership. |
| Platform order | **Web-first** — PWA on Cloudflare Pages ships first; native follows same codebase. |
| Monorepo | **Yes** — `/app` (Expo) + `/api` (Cloudflare Worker) in one repo, npm workspaces. |
| Navigation | **Expo Router** — file-based, wraps React Navigation, matches `/app` directory structure. |
| Relative dates | **"Today" / "Yesterday" / absolute** — relative for last 2 days, `Mon, May 11` beyond that. |
| Session timezone | **Device-local YYYY-MM-DD** — `new Date().toLocaleDateString('en-CA')`, no UTC conversion. |
| Stopwatch | **Not in v1** — times are typed manually. |
| JSON import | **Stubbed, not implemented** — export works; import is a v1.1 item. |

---

## Tech Stack

### Client (`/app`)

| Layer | Choice |
|---|---|
| Framework | Expo SDK 52, managed workflow |
| Language | TypeScript 5.x, strict mode |
| Navigation | `expo-router` 3.x (file-based stack) |
| State | React `useState` / `useReducer` + React Context for session store |
| Local DB (native) | `expo-sqlite` — behind `lib/localDB/native.ts` |
| Local DB (web) | Dexie.js 3.x (IndexedDB wrapper) — behind `lib/localDB/web.ts` |
| Auth (native) | `expo-auth-session` with Google provider |
| Auth (web) | Google Identity Services (GIS) One Tap |
| Session token (native) | `expo-secure-store` |
| Session token (web) | `HttpOnly` cookie set by API |
| Export | SheetJS (`xlsx`) for Excel; native CSV/JSON string; `expo-sharing` (native) / Blob download (web) |
| PWA | Workbox-generated service worker + Web App Manifest |
| Icons | `lucide-react-native` |
| Date formatting | `date-fns` |
| Testing | Jest + React Native Testing Library |

### API (`/api`)

| Layer | Choice |
|---|---|
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite at edge) |
| Routing | Hono |
| ORM / migrations | `drizzle-orm` with D1 adapter |
| Auth verification | Google ID token → JWK verification (no client secret) |
| Hosting (static) | Cloudflare Pages (`dist/` from Expo export) |
| Deployment | Wrangler CLI, GitHub push-to-deploy |

---

## Commands

```bash
# ── Root (monorepo) ──────────────────────────────────────
npm install              # install all workspaces
npm run typecheck        # tsc --noEmit across both workspaces
npm run lint             # eslint across both workspaces

# ── Client /app ──────────────────────────────────────────
npm run dev              # npx expo start --web  (web dev server)
npm run dev:native       # npx expo start         (opens Expo Go / simulator)
npm run build:web        # npx expo export --platform web  → dist/
npm test                 # jest --coverage
npm run lint             # eslint . --ext .ts,.tsx --fix

# ── API /api ─────────────────────────────────────────────
npm run dev              # wrangler dev            (local Worker + D1)
npm run deploy           # wrangler deploy
npm run migrate          # wrangler d1 migrations apply swimbuddy-db
npm run migrate:local    # wrangler d1 migrations apply swimbuddy-db --local
```

---

## Project Structure

```
swimbuddy/
├── package.json               # workspace root (npm workspaces: ["app","api"])
├── SPEC.md                    # this file
├── swimbuddy-prd.md           # product requirements
├── swimbuddy.jsx              # UI prototype (reference only, not shipped)
│
├── app/                       # Expo client
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json               # Expo config (bundleId, scheme, splash, PWA)
│   ├── app/                   # Expo Router screens (file = route)
│   │   ├── _layout.tsx        # Root layout: auth gate + navigation shell
│   │   ├── index.tsx          # Home — session list
│   │   ├── session/
│   │   │   └── [id].tsx       # Session detail
│   │   ├── settings.tsx       # Account, storage, export
│   │   └── auth.tsx           # Sign-in screen
│   ├── components/            # Shared UI (dumb, no data fetching)
│   │   ├── SessionCard.tsx
│   │   ├── DrillRow.tsx
│   │   ├── GroupContainer.tsx
│   │   ├── DrillSheet.tsx     # Bottom sheet: add/edit drill
│   │   ├── SelectionBar.tsx   # "SUM OF N / Save as group" bar
│   │   └── SyncIndicator.tsx  # Cloud icon + status dot in header
│   ├── lib/
│   │   ├── localDB/
│   │   │   ├── index.ts       # Unified async API (getAll, get, put, delete, queue*)
│   │   │   ├── native.ts      # expo-sqlite implementation
│   │   │   └── web.ts         # Dexie.js implementation
│   │   ├── sync/
│   │   │   ├── client.ts      # Mutation queue, debounced flush, retry logic
│   │   │   └── conflicts.ts   # Per-drill merge strategy
│   │   ├── auth/
│   │   │   ├── index.ts       # Auth context + useAuth hook
│   │   │   ├── google.native.ts
│   │   │   └── google.web.ts
│   │   ├── export/
│   │   │   ├── excel.ts       # SheetJS workbook builder
│   │   │   ├── csv.ts         # CSV string builder
│   │   │   ├── json.ts        # Full-fidelity JSON builder
│   │   │   ├── text.ts        # Plain-text format (WhatsApp-friendly)
│   │   │   └── share.ts       # Platform-branching: expo-sharing vs Blob download
│   │   ├── time.ts            # csToTime, formatTimeInput, todayISO, formatDate*
│   │   └── uuid.ts            # crypto.randomUUID() wrapper
│   ├── public/                # PWA assets (served by Expo's web build)
│   │   ├── manifest.webmanifest
│   │   ├── sw.js              # Workbox-generated service worker
│   │   └── icons/             # 192×192, 512×512 PNG icons
│   └── __tests__/
│       ├── unit/              # Pure logic (time utils, export builders)
│       └── integration/       # Component tests (RNTL)
│
└── api/                       # Cloudflare Worker
    ├── package.json
    ├── tsconfig.json
    ├── wrangler.toml
    ├── src/
    │   ├── index.ts           # Hono app entry, route wiring
    │   ├── routes/
    │   │   ├── auth.ts        # POST /auth/google, POST /auth/logout
    │   │   └── sync.ts        # GET /sync, POST /sync, DELETE /account
    │   ├── db/
    │   │   ├── schema.ts      # Drizzle table definitions
    │   │   ├── migrations/    # SQL migration files
    │   │   └── queries.ts     # Typed query helpers
    │   └── auth/
    │       └── google.ts      # ID token → JWK verification
    └── __tests__/
        └── routes/            # Worker integration tests (Miniflare)
```

---

## Data Model

```typescript
// Stored in local DB and mirrored to D1
interface Session {
  id: string;           // client-generated UUID
  date: string;         // YYYY-MM-DD (device-local)
  notes: string;
  drills: Drill[];
  groups: Group[];
  createdAt: string;    // ISO timestamp
  updatedAt: string;
}

interface Drill {
  id: string;
  strokeId: 'fly' | 'back' | 'breast' | 'free' | 'mixed';
  distance: number;     // meters, positive integer
  timeCs: number;       // centiseconds (e.g. 30.45 s = 3045)
  label: string;        // optional free text
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
  drillIds: string[];   // ordered refs to Drill.id within this session
  createdAt: string;
}
```

**Invariants:**
- A drill belongs to at most one group per session.
- Deleting a drill removes its `id` from any group; groups with < 2 drills are auto-deleted.
- Times are stored as centiseconds (integers) to avoid floating-point drift.
- The `date` field is set from device-local time and never converted to UTC.

---

## API Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/google` | None | Verify Google ID token, upsert user, set session cookie |
| `POST` | `/auth/logout` | Cookie | Clear session cookie |
| `GET` | `/sync?since={iso}` | Cookie | Fetch sessions updated since timestamp |
| `POST` | `/sync` | Cookie | Push batch of mutation ops from queue |
| `DELETE` | `/account` | Cookie | Soft-delete all user data |

**Mutation op shape (sent to POST /sync):**
```typescript
type MutationOp =
  | { op: 'upsert_session'; session: Session; clientVersion: number }
  | { op: 'delete_session'; sessionId: string }
```

---

## localDB Unified API

```typescript
// lib/localDB/index.ts — same interface on native and web
interface LocalDB {
  getSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  putSession(session: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
  queueMutation(op: MutationOp): Promise<void>;
  getPendingMutations(): Promise<MutationQueueEntry[]>;
  clearMutation(id: string): Promise<void>;
  getMeta(): Promise<Meta>;
  setMeta(patch: Partial<Meta>): Promise<void>;
}
```

---

## Code Style

TypeScript strict mode. No `any`. Functional components only.

```typescript
// ✅ Good — named export, explicit return type, no magic strings
export function csToTime(cs: number): string {
  const mm = Math.floor(cs / 6000);
  const ss = Math.floor((cs % 6000) / 100);
  const c  = cs % 100;
  return `${pad(mm)}:${pad(ss)}.${pad(c)}`;
}

// ✅ Good — platform branch isolated to the module boundary
export async function shareFile(
  content: string,
  filename: string,
  mimeType: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    downloadBlob(content, filename, mimeType);
  } else {
    await shareNative(content, filename, mimeType);
  }
}
```

**Conventions:**
- Files: `PascalCase` for components, `camelCase` for lib modules.
- Platform forks: prefer `Platform.OS === 'web'` branch inside one file over `.native.ts` / `.web.ts` suffixes, unless the implementations are large enough to warrant splitting.
- No default exports from lib modules; named exports only.
- No comments explaining *what* the code does — only *why* when it's non-obvious.
- No inline styles on components — keep a `styles` const at the bottom of each component file using `StyleSheet.create`.

---

## Testing Strategy

**Framework:** Jest + React Native Testing Library (RNTL)

**Test levels:**

| Level | What it covers | Location |
|---|---|---|
| Unit | Pure functions: `csToTime`, `formatTimeInput`, CSV/JSON builders, conflict merge | `app/__tests__/unit/` |
| Integration | Component render + interaction: DrillSheet, SessionCard, SelectionBar | `app/__tests__/integration/` |
| Worker | API route handlers with Miniflare (local D1) | `api/__tests__/routes/` |
| E2E | Not in v1 — manual smoke test on web before each deploy | — |

**Coverage expectation:** 80% on `lib/` utilities; components need smoke tests (renders without crash + key interaction paths).

**Key test cases to write first (TDD):**
- `csToTime` — all edge cases (0, 5999, 360000)
- `formatTimeInput` — digit accumulation and backspace
- `conflictMerge` — drills merge by id, deletions win
- `DrillSheet` — can't save with zero time or zero distance
- `SelectionBar` — shows only when ≥ 2 drills selected

---

## Boundaries

**Always do:**
- Write unit tests for every new function in `lib/`.
- Persist to localDB *before* updating React state (write-then-render).
- Scope every D1 query by `user_id` — no cross-user reads.
- Validate Google ID token server-side on every `/sync` call (cookie or JWT check).
- Run `npm run typecheck` before considering a task done.

**Ask first:**
- Adding any new npm dependency.
- Changing the D1 schema (requires a migration file).
- Adding a new API endpoint or changing an existing contract.
- Enabling any analytics, telemetry, or third-party tracking SDK.
- Changing the PWA manifest or service worker cache strategy.

**Never do:**
- Commit secrets, API keys, or `.env` files.
- Store user data outside the user's own D1 row (no cross-user aggregation).
- Use `any` in TypeScript.
- Skip the confirmation dialog before delete operations.
- Remove a failing test without approval — fix it or discuss it.

---

## Success Criteria

| # | Criterion | How to verify |
|---|---|---|
| SC1 | Log one drill in < 8 seconds (stroke → distance → time → save) | Manual timer on web, first-time user |
| SC2 | All features (except sync) work fully offline | Chrome DevTools → Network → Offline; add drill, reload |
| SC3 | Session survives a hard reload | Add drill, force-refresh, confirm drill appears |
| SC4 | Export round-trip: export JSON, import JSON, zero data loss | Manual check — import is stubbed; verify export schema matches |
| SC5 | Sync recovers full backup on fresh device in < 30 seconds | Sign in on a second browser profile, measure |
| SC6 | Web FCP < 1.5s on simulated 4G | Lighthouse, throttled network |
| SC7 | PWA is installable on iOS Safari and Android Chrome | Manual: browser install prompt appears |
| SC8 | Groups with < 2 drills are auto-deleted | Unit test + manual: remove a drill from a 2-drill group |
| SC9 | Delete session shows confirmation dialog | Manual + RNTL integration test |
| SC10 | Excel export opens in Excel/Google Sheets with correct types | Manual: open `.xlsx`, verify date column is a real date |

---

## Implementation Phases & Tasks

### Phase 0 — Scaffolding
- [ ] Init Expo project with TypeScript (`npx create-expo-app app --template tabs`)
  - Accept: `npm run dev` opens web browser with Expo Router working
  - Files: `app/`, `app/package.json`, `app/app.json`, `app/tsconfig.json`
- [ ] Configure monorepo root (`package.json` with workspaces, shared eslint + tsconfig)
  - Accept: `npm install` at root installs both workspaces
- [ ] Init Cloudflare Worker (`npx wrangler init api`)
  - Accept: `npm run dev` in `/api` starts local Wrangler + D1
- [ ] Set up D1 database + run initial migration (users + sessions tables)
  - Accept: `npm run migrate:local` succeeds; tables visible in local D1

### Phase 1 — Data Layer
- [ ] Implement `lib/time.ts` (csToTime, formatTimeInput, todayISO, formatDate, formatDateLong)
  - Accept: all unit tests pass
- [ ] Implement `lib/localDB/web.ts` (Dexie, sessions + mutation_queue + meta tables)
  - Accept: getSessions, putSession, deleteSession, queue ops work in browser
- [ ] Implement `lib/localDB/native.ts` (expo-sqlite)
  - Accept: same operations work in Expo Go on iOS/Android simulator
- [ ] Implement `lib/localDB/index.ts` (platform branch, exports unified interface)
  - Accept: callers import from `lib/localDB` and don't need Platform.OS

### Phase 2 — UI Components (from prototype)
- [ ] `SessionCard` component
  - Accept: renders date (Today/Yesterday/absolute), drill count, group count, total time, best group row
- [ ] `DrillRow` component (ungrouped — with checkbox, stroke chip, edit/delete)
  - Accept: checkbox toggles selection; edit + delete callbacks fire
- [ ] `GroupContainer` component (collapsible, ungroup X button, grouped drill rows with inline actions)
  - Accept: collapse/expand toggles; ungroup fires callback; edit/remove-from-group/delete drill fire callbacks
- [ ] `DrillSheet` bottom sheet (stroke pills, distance chips, time input, label, save button)
  - Accept: save disabled until time > 0 and distance > 0; digit accumulation works (type "3045" → "00:30.45")
- [ ] `SelectionBar` (sum display + "Save as group" → name input → save/cancel)
  - Accept: visible only when ≥ 2 ungrouped drills selected; sum correct; group saved on confirm
- [ ] `SyncIndicator` (cloud icon + status dot: green/amber/grey/red)
  - Accept: renders in header with correct color per sync state prop

### Phase 3 — Screens
- [ ] Home screen (`app/index.tsx`) — session list, FAB, empty state
  - Accept: SC1 entry point; sessions in reverse-chron order; tap opens session; FAB creates + navigates
- [ ] Session screen (`app/session/[id].tsx`) — groups, ungrouped drills, selection, three-dot menu, delete confirm
  - Accept: SC8, SC9 pass; add drill → drill appears; select 2 → SelectionBar appears
- [ ] Auth screen (`app/auth.tsx`) — Google Sign-In button, loading state, error message
  - Accept: renders without crash; button visible
- [ ] Settings screen (`app/settings.tsx`) — account info, sign out, export buttons, sync status
  - Accept: sign out clears auth; export buttons present (wired in Phase 5)
- [ ] Root layout (`app/_layout.tsx`) — auth gate (redirect to `/auth` if not signed in)
  - Accept: unauthenticated user lands on `/auth`; authenticated user lands on `/`

### Phase 4 — Auth
- [ ] `lib/auth/google.web.ts` — GIS One Tap + Sign-In button, returns Google ID token
  - Accept: sign-in flow completes; ID token available
- [ ] `lib/auth/google.native.ts` — expo-auth-session Google provider, returns ID token
  - Accept: sign-in works in Expo Go
- [ ] `lib/auth/index.ts` — AuthContext, useAuth hook, token storage (cookie web / secure-store native)
  - Accept: `useAuth().user` populated after sign-in; null after sign-out
- [ ] API: `POST /auth/google` — verify ID token (JWK), upsert user in D1, set session cookie
  - Accept: valid token → 200 + cookie; tampered token → 401
- [ ] API: `POST /auth/logout` — clear cookie
  - Accept: subsequent requests return 401

### Phase 5 — Export
- [ ] `lib/export/csv.ts` — one row per drill, columns per PRD §6.3
  - Accept: unit test round-trip; `group_name` blank for ungrouped drills
- [ ] `lib/export/json.ts` — full Session[] array, matches data model exactly
  - Accept: unit test; `JSON.parse` round-trip produces identical objects
- [ ] `lib/export/excel.ts` — SheetJS workbook (Sessions sheet, Drills sheet, Groups sheet)
  - Accept: SC10; date column is real Excel date; time column is decimal seconds
- [ ] `lib/export/text.ts` — plain text format per PRD §6.5
  - Accept: matches example output in PRD
- [ ] `lib/export/share.ts` — platform branch: expo-sharing (native) vs Blob download (web)
  - Accept: web → file downloaded; native → share sheet opens
- [ ] Wire export buttons in Settings screen
  - Accept: each format button triggers download/share

### Phase 6 — Cloud Sync
- [ ] API: `GET /sync?since={iso}` — return sessions updated since timestamp for current user
  - Accept: returns only caller's sessions; since filter works
- [ ] API: `POST /sync` — apply batch of MutationOps to D1; return canonical updated_at
  - Accept: upsert_session and delete_session ops work; user_id scoped
- [ ] `lib/sync/conflicts.ts` — drill merge by id, deletions win, higher updated_at wins on edit
  - Accept: unit tests for all three merge cases
- [ ] `lib/sync/client.ts` — mutation queue flush (debounced 2s), retry on failure, Background Sync registration (web)
  - Accept: offline mutation queued; on reconnect, queue flushes automatically; pending count updates SyncIndicator
- [ ] Wire sync into localDB writes — every put/delete appends to mutation queue
  - Accept: SC2, SC3, SC5 pass

### Phase 7 — PWA & Deployment
- [ ] Web App Manifest (`public/manifest.webmanifest`) — icons, theme, standalone display mode
  - Accept: SC7; Lighthouse PWA audit passes
- [ ] Service worker (Workbox) — app shell cache-first, API network-first, Background Sync handler
  - Accept: SC2 (offline works after first load); `flush-mutations` sync tag registered
- [ ] Cloudflare Pages project — build command, output dir, Node version, env vars
  - Accept: push to `main` → auto-deploy; preview URL on feature branch
- [ ] Cloudflare Worker deploy — `wrangler deploy`, custom domain (optional)
  - Accept: `POST /auth/google` reachable from Pages deploy

### Phase 8 — Polish & Accessibility
- [ ] Touch targets ≥ 44pt on all interactive elements
- [ ] VoiceOver / TalkBack labels on all Pressables and icons
- [ ] Text reflows at large accessibility text size (no truncation on key content)
- [ ] Responsive: mobile layout centered at 390pt width on desktop (phone-frame style)
- [ ] FlatList on Home screen (replaces any ScrollView + .map() anti-pattern)
  - Accept: SC6 (Lighthouse performance); smooth at 500+ sessions

---

## Open Questions (carry-forward)

| # | Question | Owner | Target |
|---|---|---|---|
| OQ1 | Custom domain or `swimbuddy.pages.dev`? | Buddhi | Before Phase 7 |
| OQ2 | D1 paid plan threshold — cost cap? | Buddhi | Before launch |
| OQ3 | Account deletion hard-purge delay — 30 days? | Buddhi | Before Phase 4 |
| OQ4 | iOS Safari Background Sync fallback — confirm acceptable via testing | Dev | Phase 6 |

---

*This spec is a living document. Update it when decisions change; commit it alongside the code.*
