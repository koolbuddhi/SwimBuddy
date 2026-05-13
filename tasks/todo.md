# SwimBuddy v1.0 — Task List

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done  
**Last updated:** 2026-05-13

---

## Phase 0 — Scaffolding

- [ ] **T01** · Init monorepo root + Expo app with TypeScript + Expo Router
- [ ] **T02** · Init Cloudflare Worker (Hono + Drizzle) + D1 schema + initial migration
- [ ] **T03** · Shared TypeScript types (Session, Drill, Group, MutationOp, LocalDB interface)

### 🔵 Checkpoint A — Scaffolding complete
- [ ] Both workspaces install and typecheck cleanly
- [ ] Local D1 tables exist
- [ ] Shared types are in place

---

## Phase 1 — Data Layer

- [ ] **T04** · `lib/time.ts` — csToTime, formatTimeInput, todayISO, formatDate, relativeDate + unit tests
- [ ] **T05** · `lib/localDB/web.ts` — Dexie (IndexedDB) implementation of LocalDB interface
- [ ] **T06** · `lib/localDB/native.ts` — expo-sqlite implementation of LocalDB interface
- [ ] **T07** · `lib/localDB/index.ts` + `SessionContext` — unified platform branch + React Context

### 🔵 Checkpoint B — Data layer solid
- [ ] All unit tests pass
- [ ] Sessions persist across hard reloads on web

---

## Phase 2 — Core UI Slice: Log a Drill

- [ ] **T08** · `DrillSheet` component — stroke pills, distance chips, time digit-input, label, save
- [ ] **T09** · `DrillRow` + `SessionCard` components
- [ ] **T10** · Home screen — FlatList of SessionCards, FAB, empty state
- [ ] **T11** · Session screen (basic) — drill list, add/edit/delete drill, delete session with confirm

### 🔵 Checkpoint C — Core drill logging works (offline)
- [ ] SC1: log one drill < 8 seconds (manual timer)
- [ ] SC3: add drill, hard-refresh, drill still present

---

## Phase 3 — Group Management

- [ ] **T12** · `GroupContainer` + `GroupedDrillRow` — collapsible, ungroup, inline action drawer
- [ ] **T13** · `SelectionBar` — sum display, save-as-group name input
- [ ] **T14** · Wire group logic into Session screen — select, save, ungroup, remove, auto-delete

### 🔵 Checkpoint D — Full offline app complete
- [ ] SC8: auto-delete group when < 2 drills
- [ ] SC9: delete session confirmation dialog
- [ ] **Human review before building auth/backend**

---

## Phase 4 — Auth

- [ ] **T15** · API: `POST /auth/google` — JWK verify, upsert user, set session cookie
- [ ] **T16** · API: `POST /auth/logout` — clear cookie
- [ ] **T17** · `lib/auth/google.web.ts` — GIS One Tap + Sign-In button
- [ ] **T18** · `lib/auth/index.ts` — AuthContext, useAuth hook, token storage
- [ ] **T19** · Auth screen + root layout auth gate (redirect unauthenticated → /auth)

### 🔵 Checkpoint E — Auth working
- [ ] Sign in → home screen; sign out → auth screen
- [ ] Tampered token → 401 from Worker

---

## Phase 5 — Export

- [ ] **T20** · `lib/export/csv.ts` + `json.ts` + `text.ts` + unit tests
- [ ] **T21** · `lib/export/excel.ts` — SheetJS 3-sheet workbook (lazy-loaded)
- [ ] **T22** · `lib/export/share.ts` — expo-sharing (native) / Blob download (web)
- [ ] **T23** · Settings screen — account info, export buttons, sign out, delete account

### 🔵 Checkpoint F — Export working
- [ ] SC10: Excel opens correctly in Google Sheets
- [ ] CSV and JSON download in browser

---

## Phase 6 — Cloud Sync

- [ ] **T24** · API: `GET /sync` + `POST /sync` routes
- [ ] **T25** · `lib/sync/conflicts.ts` — drill merge by ID, deletions win + unit tests
- [ ] **T26** · `lib/sync/client.ts` — mutation queue, debounced flush, retry, Background Sync
- [ ] **T27** · Wire sync into SessionContext writes + `SyncIndicator` (real implementation)
- [ ] **T28** · `lib/auth/google.native.ts` — expo-auth-session Google provider

### 🔵 Checkpoint G — Full MVP feature-complete
- [ ] SC2: offline logging + auto-sync on reconnect
- [ ] SC5: sync round-trip on second browser profile < 30 seconds
- [ ] All 10 success criteria reachable
- [ ] **Human review before production deploy**

---

## Phase 7 — PWA & Deploy

- [ ] **T29** · Web App Manifest + 192×192 + 512×512 icons
- [ ] **T30** · Workbox service worker (cache strategies + Background Sync handler)
- [ ] **T31** · Cloudflare Pages + Worker production deploy + CORS + env vars
- [ ] **T32** · API: `DELETE /account` — soft-delete user data + cron stub

### 🔵 Checkpoint H — Deployed and installable
- [ ] SC6: Lighthouse FCP < 1.5s on production URL
- [ ] SC7: PWA installable on iOS Safari + Android Chrome

---

## Phase 8 — Polish

- [ ] **T33** · Accessibility — touch targets ≥ 44pt, VoiceOver labels, large-text reflow
- [ ] **T34** · Performance — FlatList, Lighthouse budget, xlsx lazy-loaded
- [ ] **T35** · Responsive layout — phone-frame at 390pt on desktop browsers
- [ ] **T36** · Final validation — all 10 success criteria (SC1–SC10) documented as passing

### 🏁 Final Checkpoint — Ship
- [ ] All 36 tasks complete
- [ ] All 10 success criteria passing
- [ ] `npm test` green in both workspaces
- [ ] `npm run typecheck` green in both workspaces
- [ ] Human sign-off
