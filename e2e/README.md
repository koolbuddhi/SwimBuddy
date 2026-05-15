# SwimBuddy E2E (Playwright)

End-to-end coverage for the production user flows: auth, drill CRUD,
groups, cross-device sync, and Excel export.

## Specs

| File | Tests | Covers |
| --- | --- | --- |
| `auth.spec.ts` | 4 | redirect to /auth, sign-in via backdoor, sign-out, /health |
| `drill-crud.spec.ts` | 7 | create session, add/edit/delete drill, digit-input ≥1 min regression, date edit |
| `groups.spec.ts` | 4 | selection bar sum, save group, auto-dissolve below 2 drills, ungroup |
| `sync-cross-device.spec.ts` | 2 | A→B sync via manual button + via DrillSheet open trigger |
| `export.spec.ts` | 3 | per-session .xlsx, last-10-days .xlsx, empty-no-download |
| `prod-smoke.spec.ts` | 5 | live `swimbuddy.pages.dev` + Worker health, manifest, /sync 401, backdoor gated |

26 total. Plus 1 `@smoke`-tagged test in `auth.spec.ts` that runs in
both projects.

## Two projects

- `local` — drives `http://localhost:8081` (Expo) + `http://localhost:8787` (wrangler dev).
  The `/auth/test-signin` backdoor is enabled via `.dev.vars`.
- `prod-smoke` — drives `https://swimbuddy.pages.dev` + the production Worker.
  Only the `@smoke`-tagged subset runs here; the rest need the backdoor which is
  intentionally disabled in production.

## Run locally

Prereqs (one-time):

```bash
# From the repo root
npm ci
cd e2e && npx playwright install chromium

# Make sure api/.dev.vars contains:
#   GOOGLE_CLIENT_ID=<your value>
#   ALLOW_TEST_SIGNIN=true
```

Then start the two backing services in two terminals:

```bash
# Terminal 1 — Worker
cd api && npm run dev

# Terminal 2 — Expo web
cd app && npm run dev
```

Run the tests:

```bash
# Full local suite
npm run test:e2e

# Single file
cd e2e && npx playwright test tests/drill-crud.spec.ts

# Headed (watch what happens in a real browser)
cd e2e && npx playwright test --headed

# Production smoke (no backdoor required)
npm run test:e2e:prod
```

Reports live in `e2e/playwright-report/` after a run. Open with:

```bash
npm run report --workspace=e2e
```

## Known limitations

**Expo's Metro dev server can crash under sustained Playwright load.** The
suite hits the dev server with many rapid navigations and bundle requests;
after a few minutes Metro can fall over with `ERR_CONNECTION_REFUSED`.
Symptoms: the first batch of tests passes, then later ones fail with
connection-refused errors at `clearLocalDB` / `signInTestUser` calls.

Workarounds:

1. **Run with `--workers=1`** — fewer parallel requests, less memory pressure.
2. **Restart `expo start` between full-suite runs** if you're iterating.
3. **CI is fine** — the GitHub Actions workflow brings up a fresh Metro per
   run, so the crash doesn't repeat there.

The cleaner long-term fix is to build a static bundle with `expo export`
once and serve it via a plain HTTP server (no Metro in the loop). Plumbed
as a `webServer` config in `playwright.config.ts` when needed. Skipped for
v1 because it adds a multi-minute build step before every test run.

## Test isolation

Each test gets a unique user id derived from `testInfo.testId` (see
`fixtures/sign-in.ts` → `userFor(testInfo)`). Two contexts inside the
same test share the same user (so cross-device sync works), but
different tests can't pollute each other's server-side state.

Local IndexedDB is wiped in every `beforeEach` via `clearLocalDB(page)`.

## CI

`.github/workflows/e2e.yml` runs the local project on every PR + push to
main, and the `prod-smoke` project on main-only pushes after a successful
local run. Logs and the Playwright HTML report are uploaded as artifacts.
