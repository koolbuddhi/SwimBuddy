# SwimBuddy

Offline-first PWA for logging swim practice. Family-of-three use, deployed
to production. Mobile-first (works in iOS/Android Safari/Chrome and as an
installable PWA), with native iOS/Android via Expo if needed later.

## Workspaces

```
app/        Expo SDK 54 + React Native 0.81 + Expo Router 6 — the UI
api/        Cloudflare Worker (Hono + D1 + Drizzle + jose) — sync + auth
e2e/        Playwright suite covering auth/CRUD/groups/sync/export
tasks/      plan.md + todo.md from the original spec breakdown
swimbuddy-prd.md, SPEC.md   source of truth for product + tech decisions
```

## Tech stack

- **App**: Expo 54, RN 0.81, RN-Web, Expo Router 6 (file-based), TypeScript strict
- **Local DB**: Dexie (IndexedDB) on web, expo-sqlite on native — same `LocalDB` interface, picked via `index.web.ts` / `index.native.ts` platform extensions
- **State**: React Context (no Redux). `AuthContext` + `SessionContext` at the root.
- **Auth**: Google Identity Services on web, expo-auth-session on native. Worker verifies ID tokens with `jose`.
- **Sync**: HTTP-only `sb_session` cookie + mutation queue (in Dexie/SQLite) + `SyncClient.flush()` / `pull()`.
- **API**: Cloudflare Worker, Hono router, D1 (SQLite at edge), Drizzle schema.
- **Tests**: Jest (app + api), Playwright (e2e). 192 unit + 26 e2e.

## Commands

```
# App (run from repo root unless noted)
npm run dev --workspace=app           # expo start --web on :8081
npm test --workspace=app              # jest (192 tests)
npm run typecheck --workspace=app     # tsc --noEmit

# API
npm run dev --workspace=api           # wrangler dev on :8787
npm test --workspace=api              # jest (21 tests)
npm run migrate:local --workspace=api # apply D1 migrations locally
npm run migrate --workspace=api       # apply to remote (production)

# E2E
npm run test:e2e                      # local suite (needs both servers up)
npm run test:e2e:prod                 # smoke against deployed app

# Deploy
cd api && npx wrangler deploy
cd app && EXPO_PUBLIC_API_BASE=https://swimbuddy-api.buddhima.workers.dev \
  npx expo export --platform web \
  && npx wrangler pages deploy dist --project-name=swimbuddy --branch=main
```

## Production URLs

- App: <https://swimbuddy.pages.dev>
- Worker: <https://swimbuddy-api.buddhima.workers.dev>
- D1: `swimbuddy-db` (id `3225990c-...`) on the `buddhima@gmail.com` Cloudflare account

## Secrets / env

| File | Where | Contains |
| --- | --- | --- |
| `app/.env` | gitignored, local | `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, `EXPO_PUBLIC_API_BASE` |
| `api/.dev.vars` | gitignored, local | `GOOGLE_CLIENT_ID`, `ALLOW_TEST_SIGNIN=true` |
| Cloudflare secret store | production Worker | `GOOGLE_CLIENT_ID` (set via `wrangler secret put`) |
| `api/wrangler.toml` `[vars]` | checked in | `ALLOWED_ORIGINS` |

`wrangler secret put` writes to **production only**. Local `wrangler dev`
reads `.dev.vars`. These are independent stores — setting one does **not**
populate the other (we lost an hour to this).

## Code conventions

- **TestIDs over aria-labels** for Playwright locators. React Native Web's
  Pressable aria-label rendering is flaky; `testID` always maps to
  `data-testid` on web. Every interactive element gets one.
- **`boxShadow` not `shadow*` props** — RN-Web 0.20+ deprecates the legacy
  shadow* style props. Use `boxShadow: '0px 4px 8px rgba(...)'` strings.
- **Platform branching via file extensions**: `localDB/index.web.ts` (Dexie)
  vs `localDB/index.native.ts` (expo-sqlite). Do **not** use `Platform.OS`
  inside a `require()` — Metro bundles both branches and tries to resolve
  `expo-sqlite/wa-sqlite.wasm` on web, which fails.
- **No `Alert.alert`** for destructive confirms. RN-Web silently no-ops the
  button callbacks. Use `<ConfirmDialog>` (`components/ConfirmDialog.tsx`)
  — it's a Modal-based confirm that works on web and native.
- **Time** is centiseconds (`timeCs: number`). Convert via the helpers
  in `lib/time.ts`:
  - `digToCs(digits)` for 6-digit MMSSCC input → cs (never `parseInt`)
  - `csToDig(cs)` for cs → MMSSCC digit string
  - `csToTime(cs)` for cs → "MM:SS.CC" display
- **Mutation queue is the source of truth for sync** — every write to
  `localDB` is paired with `queueOp(...)` in `SessionContext`. Don't add
  a new write path without queuing.

## Architecture (offline-first + sync)

Each device keeps its own local DB. Every write:
1. Updates local DB and React state immediately (UI is instant)
2. Appends an op to the mutation queue (`upsert_session` or `delete_session`)
3. Fires `sync()` in the background — flush queue → pull merged state → refresh UI

Auto-sync triggers (`SessionContext`):

- User signs in
- Tab regains focus (`visibilitychange`) — web only
- Network reconnects (`online`) — web only
- After every local write (fire-and-forget)
- Pull-to-refresh on Home / Session lists
- Opening the DrillSheet (FAB or pencil)
- Every 30s while tab is visible
- Manual "Sync now" in Settings

Server-side conflict resolution is last-writer-wins per session (D1
`ON CONFLICT (id) DO UPDATE`). Per-drill merging exists in
`lib/sync/conflicts.ts` but isn't wired in — for family use, LWW is fine.

## Known gotchas

1. **Cross-site cookies**: pages.dev + workers.dev have different eTLD+1,
   so the session cookie needs `SameSite=None; Secure` in production.
   `Lax` only works on localhost where both ports are same-site.
2. **Google OAuth Console**: Authorized JavaScript origins must include
   the production app URL. Without it the GIS button iframe gets 403.
   OAuth consent screen must be "Published" (not "Testing") for family
   members to sign in without being in the Test Users list.
3. **Metro can crash under e2e load**: the local Playwright suite hits
   the Expo dev server hard. Documented in `e2e/README.md`. CI is fine.
4. **PWA install prompt**: requires manifest + activated SW + a *valid*
   icon at the manifest's path. We had broken paths once that prevented
   install — `app/public/icons/icon-192.png` and `icon-512.png` are the
   sources, generated from `app/assets/images/icon.png` via `sips`.
5. **Group auto-delete**: deleting a drill that drops a group below 2
   drills removes the group entirely; the remaining drill becomes
   ungrouped (this is spec SC8, not a bug — was reverted once).
6. **Date timezone**: `todayISO()` uses `toLocaleDateString('en-CA')`
   for YYYY-MM-DD in device-local time, not UTC. Don't switch to
   `toISOString().slice(0, 10)` — it'll roll over a day for users east
   of UTC.
7. **Share permission model**: ownership of a session is immutable —
   it stays with the original creator even if a write-share collaborator
   edits it. Sync uses per-drill merge on the server so that two devices
   adding different drills offline both survive; same-drill edits remain
   last-write-wins. `selectedOwnerId` in `SessionContext` filters the
   visible list — read-only views hide the FAB / edit / delete via the
   `useViewingPermission()` hook.

## Boundaries

- **Never commit** `.env`, `.dev.vars`, or anything matching `**/secret*`.
- **Ask before** running `wrangler deploy`, `wrangler pages deploy`,
  `wrangler secret put`, `wrangler d1 migrations apply --remote`, or
  any GitHub PR/issue write. These touch shared state.
- **Ask before** modifying the D1 schema — there are real users.
- **Ask before** changing the Worker's CORS origin or cookie attributes.
  These broke production once already; the regression tests in
  `api/src/__tests__/auth.test.ts` lock the cookie attrs in.
- **Don't replace** `<ConfirmDialog>` calls with `Alert.alert`. It works
  on native but not on web; we already paid that bill.
- **Don't introduce** a new sync trigger without coalescing — the
  `syncInFlight` + `syncScheduled` pattern in `SessionContext.sync()`
  exists to drain writes queued during a flush. Adding a parallel
  fetch path will lose writes.

## When tests pass but production fails

Three recurring patterns:

1. **Browser policy enforcement** (cookies, popups, FedCM) doesn't run in
   Jest. The cross-site cookie bug existed for hours with all unit tests
   green — Jest happily injects whatever cookie you tell it to. Add a
   browser-level assertion (Playwright) or a header-attribute assertion
   when you ship cross-origin behavior.
2. **RN-Web shim differences**: `Alert.alert`, `pointerEvents` prop,
   accessibility-name lookup, RefreshControl visuals — all differ from
   native. When you ship cross-platform code, test in both.
3. **Cached service worker / bundle**: a hard refresh (Cmd+Shift+R) is
   often the difference between "broken" and "works for me". If a bug
   reproduces only on the user's device, ask them to hard-refresh first.

## Test conventions

- Use **testIDs** for Playwright locators (see Code Conventions).
- One **regression test per known bug** — every entry under "Known
  gotchas" above has a corresponding test that would fail if the bug
  regressed. New entries should ship with new tests.
- Mock the platform-specific stuff (`SyncClient`, `useAuth`,
  `localDB`) at the test-file level; don't reach into real browser APIs
  from Jest.
- E2E uses `userFor(testInfo)` for per-test user isolation. Server-side
  D1 state otherwise leaks across tests.
