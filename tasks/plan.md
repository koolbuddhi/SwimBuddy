# Implementation Plan: SwimBuddy v1.0 MVP

**Source spec:** `../SPEC.md`  
**Created:** 2026-05-13  
**Status:** Ready for human review

---

## Overview

SwimBuddy is a mobile-first Expo app (iOS / Android / Web PWA) for logging swimming practice sessions. Coaches type drill times, group them into named sets (e.g. "IM Attempt 1"), and review history. Data is stored locally first and synced to a Cloudflare Worker + D1 backend when online.

The build is organized into 8 phases delivered as 36 tasks. Each task is S–M sized (1–5 files), leaves the system in a working state, and has explicit acceptance criteria and verification steps. Phases 0–3 are entirely offline and auth-free — a working drill-logging app is delivered before any cloud infrastructure is built.

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Offline-first, phases 0–3 before auth | Validates the core UX loop (log drill → group → review) without any backend risk |
| Vertical slices per phase | Each phase ships a testable user capability, not a horizontal layer |
| Unified `localDB` interface | Callers never import Dexie or expo-sqlite directly; platform swap is invisible to UI code |
| SessionContext wraps localDB | One React Context owns all session state; screens never call localDB directly |
| D1 sessions table stores `data` as JSON | Drills + groups are always accessed together; no joins needed at this scale |
| Hono for Worker routing | Minimal, Worker-native, typed middleware; no Express baggage |
| Mutation queue → Background Sync | Writes are never lost offline; service worker retries even after tab close (on supporting browsers) |

---

## Dependency Graph

```
T01 Monorepo + Expo scaffold
    │
    ├── T02 Cloudflare Worker + D1 schema
    │       │
    │       ├── T15 API: POST /auth/google ──────────────────────┐
    │       ├── T16 API: POST /auth/logout                       │
    │       ├── T24 API: GET+POST /sync                          │
    │       └── T32 API: DELETE /account                         │
    │                                                             │
    ├── T03 Shared TS types                                       │
    │       │                                                     │
    │       ├── T04 lib/time.ts                                   │
    │       │       │                                             │
    │       │       └── T08 DrillSheet                           │
    │       │           T09 DrillRow + SessionCard               │
    │       │           T12 GroupContainer                        │
    │       │           T13 SelectionBar                          │
    │       │                                                     │
    │       ├── T05 localDB/web.ts (Dexie)                        │
    │       ├── T06 localDB/native.ts (expo-sqlite)               │
    │       └── T07 localDB/index.ts + SessionContext             │
    │               │                                             │
    │               ├── T10 Home screen                           │
    │               ├── T11 Session screen (basic)                │
    │               │       │                                     │
    │               │       └── T14 Session screen (groups)       │
    │               │                                             │
    │               ├── T17 lib/auth/google.web.ts ──────────────┤
    │               ├── T18 lib/auth/index.ts (AuthContext) ──────┤
    │               │       │                                     │
    │               │       └── T19 Auth screen + root layout ────┘
    │               │
    │               ├── T20 lib/export/csv+json+text
    │               ├── T21 lib/export/excel.ts
    │               ├── T22 lib/export/share.ts
    │               │       │
    │               │       └── T23 Settings screen
    │               │
    │               ├── T25 lib/sync/conflicts.ts
    │               └── T26 lib/sync/client.ts
    │                       │
    │                       └── T27 Wire sync + SyncIndicator
    │
    ├── T28 lib/auth/google.native.ts
    ├── T29 PWA manifest + icons
    ├── T30 Workbox service worker
    └── T31 Cloudflare Pages + Worker deploy
```

---

## Parallelization Opportunities

| Tasks that can run concurrently | Gate |
|---|---|
| T05 (Dexie) + T06 (expo-sqlite) | Both depend on T03; implement in parallel sessions |
| T15 (auth route) + T17 (GIS client) | API and client sides of auth can be built independently |
| T20 (csv/json/text) + T21 (excel) | Both depend on T03 types; no shared state |
| T29 (manifest) + T30 (service worker) | Independent; combine in one session or split |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Expo Router + Dexie on web has quirks (SSR edge cases) | Med | Pin Expo SDK 52; test web build in CI from T07 onward |
| Google JWK verification in Cloudflare Worker has no `crypto.subtle` gotchas | Med | Use `jose` library (Worker-compatible JWT lib); test with Miniflare in T15 |
| Background Sync not supported on iOS Safari | Low | Implement `visibilitychange` + `NetInfo` fallback in T26; document limitation |
| SheetJS bundle size (~250 KB gzipped) blows Lighthouse budget | Med | Lazy-load excel.ts behind a dynamic import in T21; verify in T34 |
| expo-sqlite API changed in SDK 52 (new async API) | Med | Use `useSQLiteContext` hook pattern from Expo SDK 52 docs; confirm in T06 |
| D1 free tier write quota under heavy testing | Low | Use local D1 (wrangler --local) for all development; production D1 only for T31 |

---

## Phase Details

### Phase 0 — Scaffolding (T01–T03)

**Goal:** Working monorepo. `npm run dev` opens Expo web. `wrangler dev` starts local Worker.

---

### Phase 1 — Data Layer (T04–T07)

**Goal:** All session data can be written and read from the local store. No UI yet — verified via unit tests and a browser console smoke test.

---

### Phase 2 — Core UI Slice: Log a Drill (T08–T11)

**Goal:** A coach can open the app, create a session, log a drill, and see it in the list — entirely offline, no auth.

This is the most important vertical slice. If this flow is clunky, the app fails its core purpose.

---

### Phase 3 — Group Management (T12–T14)

**Goal:** Select 2+ ungrouped drills, see running sum, save as a named group, collapse/expand groups, ungroup, remove drill from group.

---

**CHECKPOINT C — Core app complete (offline)**

At this point SwimBuddy is a fully working offline drill logger. All 8 use cases except cloud sync and export work. This is a meaningful milestone to demo or test with a real coach before building the backend.

---

### Phase 4 — Auth (T15–T19)

**Goal:** Sign in with Google, session persists across reloads, unauthenticated users are redirected to the sign-in screen.

Build the API route first (T15–T16) so the client (T17–T19) has something to call.

---

### Phase 5 — Export (T20–T23)

**Goal:** Export all sessions or a single session as CSV, JSON, Excel (.xlsx), or plain text. Download on web, share sheet on native.

---

### Phase 6 — Cloud Sync (T24–T28)

**Goal:** Mutations are queued locally and flushed to the Worker. On reconnect, pending changes sync automatically. Fresh device gets full history after sign-in.

---

**CHECKPOINT F — Full MVP feature-complete**

All 10 success criteria are reachable from this point. This is the pre-deploy validation gate.

---

### Phase 7 — PWA & Deploy (T29–T32)

**Goal:** App is installable on iOS/Android via browser. Cloudflare Pages deploy is live. Production Worker + D1 is connected.

---

### Phase 8 — Polish (T33–T36)

**Goal:** Accessibility, performance, and responsive layout meet the spec. All 10 success criteria pass.

---

## Open Questions (carry into implementation)

| # | Question | Needed by |
|---|---|---|
| OQ1 | Custom domain or `swimbuddy.pages.dev`? | T31 |
| OQ2 | D1 paid plan threshold / cost cap | T31 |
| OQ3 | Account deletion hard-purge delay (30 days proposed) | T32 |
| OQ4 | iOS Safari Background Sync fallback — test on real device | T26 |
