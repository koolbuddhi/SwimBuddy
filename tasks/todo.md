# SwimBuddy v1.0 — Task List

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done  
**Last updated:** 2026-05-14

---

## Phase 0 — Scaffolding

- [x] **T01** · Init monorepo root + Expo app with TypeScript + Expo Router
- [x] **T02** · Init Cloudflare Worker (Hono + Drizzle) + D1 schema + initial migration
- [x] **T03** · Shared TypeScript types (Session, Drill, Group, MutationOp, LocalDB interface)

### 🔵 Checkpoint A — Scaffolding complete
- [x] Both workspaces install and typecheck cleanly
- [x] Local D1 tables exist
- [x] Shared types are in place

---

## Phase 1 — Data Layer

- [x] **T04** · `lib/time.ts` — csToTime, formatTimeInput, todayISO, formatDate, relativeDate + unit tests
- [x] **T05** · `lib/localDB/web.ts` — Dexie (IndexedDB) implementation of LocalDB interface
- [x] **T06** · `lib/localDB/native.ts` — expo-sqlite implementation of LocalDB interface
- [x] **T07** · `lib/localDB/index.ts` + `SessionContext` — unified platform branch + React Context

### 🔵 Checkpoint B — Data layer solid
- [x] All unit tests pass
- [x] Sessions persist across hard reloads on web

---

## Phase 2 — Core UI Slice: Log a Drill

- [x] **T08** · `DrillSheet` component — stroke pills, distance chips, time digit-input, label, save
- [x] **T09** · `DrillRow` + `SessionCard` components
- [x] **T10** · Home screen — FlatList of SessionCards, FAB, empty state
- [x] **T11** · Session screen (basic) — drill list, add/edit/delete drill, delete session with confirm

### 🔵 Checkpoint C — Core drill logging works (offline)
- [x] SC1: log one drill < 8 seconds (manual timer)
- [x] SC3: add drill, hard-refresh, drill still present

---

## Phase 3 — Group Management

- [x] **T12** · `GroupContainer` + `GroupedDrillRow` — collapsible, ungroup, inline action drawer
- [x] **T13** · `SelectionBar` — sum display, save-as-group name input
- [x] **T14** · Wire group logic into Session screen — select, save, ungroup, remove, auto-delete

### 🔵 Checkpoint D — Full offline app complete
- [x] SC8: auto-delete group when < 2 drills
- [x] SC9: delete session confirmation dialog
- [x] **Human review before building auth/backend**

---

## Phase 4 — Auth

- [x] **T15** · API: `POST /auth/google` — JWK verify, upsert user, set session cookie
- [x] **T16** · API: `POST /auth/logout` — clear cookie
- [x] **T17** · `lib/auth/google.web.ts` — GIS One Tap + Sign-In button
- [x] **T18** · `lib/auth/index.ts` — AuthContext, useAuth hook, token storage
- [x] **T19** · Auth screen + root layout auth gate (redirect unauthenticated → /auth)

### 🔵 Checkpoint E — Auth working
- [x] Sign in → home screen; sign out → auth screen
- [x] Tampered token → 401 from Worker

---

## Phase 5 — Export

- [x] **T20** · `lib/export/csv.ts` + `json.ts` + `text.ts` + unit tests
- [x] **T21** · `lib/export/excel.ts` — SheetJS 3-sheet workbook (lazy-loaded)
- [x] **T22** · `lib/export/share.ts` — expo-sharing (native) / Blob download (web)
- [x] **T23** · Settings screen — account info, export buttons, sign out, delete account

### 🔵 Checkpoint F — Export working
- [x] SC10: Excel opens correctly in Google Sheets
- [x] CSV and JSON download in browser

---

## Phase 6 — Cloud Sync

- [x] **T24** · API: `GET /sync` + `POST /sync` routes
- [x] **T25** · `lib/sync/conflicts.ts` — drill merge by ID, deletions win + unit tests
- [x] **T26** · `lib/sync/client.ts` — mutation queue, debounced flush, retry, Background Sync
- [x] **T27** · Wire sync into SessionContext writes + `SyncIndicator` (real implementation)
- [x] **T28** · `lib/auth/google.native.ts` — expo-auth-session Google provider

### 🔵 Checkpoint G — Full MVP feature-complete
- [x] SC2: offline logging + auto-sync on reconnect
- [x] SC5: sync round-trip on second browser profile < 30 seconds
- [x] All 10 success criteria reachable
- [x] **Human review before production deploy**

---

## Phase 7 — PWA & Deploy

- [x] **T29** · Web App Manifest + 192×192 + 512×512 icons
- [x] **T30** · Workbox service worker (cache strategies + Background Sync handler)
- [x] **T31** · Cloudflare Pages + Worker production deploy + CORS + env vars
- [x] **T32** · API: `DELETE /account` — soft-delete user data + cron stub

### 🔵 Checkpoint H — Deployed and installable
- [x] SC6: Lighthouse FCP < 1.5s on production URL
- [x] SC7: PWA installable on iOS Safari + Android Chrome

---

## Phase 8 — Polish

- [x] **T33** · Accessibility — touch targets ≥ 44pt, VoiceOver labels, large-text reflow
- [x] **T34** · Performance — FlatList, Lighthouse budget, xlsx lazy-loaded
- [x] **T35** · Responsive layout — phone-frame at 390pt on desktop browsers
- [x] **T36** · Final validation — all 10 success criteria (SC1–SC10) documented as passing

### 🏁 Final Checkpoint — Ship
- [x] All 36 tasks complete
- [x] All 10 success criteria passing
- [x] `npm test` green in both workspaces (178 tests)
- [x] `npm run typecheck` green in both workspaces
- [x] Human sign-off
