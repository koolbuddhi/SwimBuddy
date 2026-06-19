# Feature Plan: Stopwatch Widget for Live Time Entry

**Status:** Ready for review
**Branch:** `feat/share-and-stopwatch`
**Depends on:** existing time-entry helpers in `lib/time.ts`

---

## Summary

Add a stopwatch widget next to the existing time input in the drill editor
so a user can time a live swim, then commit the measured value into the
time field with one tap. The existing manual digit-entry path is left
completely untouched.

---

## Locked decisions

| Aspect | Decision |
| --- | --- |
| UI shape | **Separate widget** beneath the time input. **Not** repurposing the textbox. |
| Buttons | `Start` → `Stop` → `Resume` (post-stop) / `Reset` / `Use` |
| State storage | Ephemeral. Not persisted in localDB. Lives in component state. |
| Commit path | "Use" writes `csToDig(elapsedCs)` into the existing time input via the exact `digToCs`/`csToDig` helpers — no new write path. |
| Multi-lap | **Not in v1.** Single elapsed value. |
| Background behaviour | Stopwatch keeps running when the tab is backgrounded. Elapsed is computed from `startTimestamp + accumulatedBeforePause`, not by counting rAF ticks. |
| Accuracy unit | Centiseconds (cs), matching `timeCs` everywhere else. |

---

## Why separate, not same-textbox

1. Repurposing the textbox would alter the existing digit-entry pipeline
   (`digToCs`, focus/keyboard handling). You explicitly asked we don't.
2. `lib/time.ts` has hard tests around the digit accumulator. A live
   ticking display fights those invariants.
3. Real swim sessions: the previous drill's time is often still on screen
   for review while the next drill is being timed. Two widgets, two roles.

---

## File touches

| Path | Change |
| --- | --- |
| `app/hooks/useStopwatch.ts` | **NEW** — state machine + tick loop, returns `{ status, elapsedCs, start, stop, resume, reset }`. |
| `app/components/StopwatchWidget.tsx` | **NEW** — presentational; calls the hook; renders buttons; emits `onUse(cs)`. |
| `app/components/DrillRow.tsx` *(or wherever the time input lives — confirm during build)* | Adds `<StopwatchWidget onUse={cs => setTimeCs(cs)} />` directly beneath the time input. |
| `app/__tests__/useStopwatch.test.ts` | **NEW** — fake-timer-driven unit tests. |
| `app/__tests__/StopwatchWidget.test.tsx` | **NEW** — interaction tests. |
| `e2e/tests/stopwatch.spec.ts` | **NEW** — Playwright: start → wait → stop → use → save → reopen → assert. |

---

## Hook contract

```ts
type StopwatchStatus = 'idle' | 'running' | 'stopped'

function useStopwatch(): {
  status: StopwatchStatus
  elapsedCs: number          // updates ~10×/sec while running
  start(): void              // idle  → running
  stop(): void               // running → stopped (elapsed frozen)
  resume(): void             // stopped → running (continues from elapsed)
  reset(): void              // any → idle, elapsedCs = 0
}
```

Implementation notes:
- Anchor on `Date.now()` for the wall-clock baseline; `requestAnimationFrame`
  is used **only** to trigger re-render, not to compute elapsed. That keeps
  it accurate across tab background/throttle.
- Centisecond rounding: `Math.floor((now - startedAt + accumulatedMs) / 10)`.

---

## Widget UX states

```
idle                  ┌──────────────────────────┐
                      │  00:00.00                │
                      │  [ ▶ Start ]             │
                      └──────────────────────────┘

running               ┌──────────────────────────┐
                      │  00:14.23                │   ← live update ~10Hz
                      │  [ ⏸ Stop ] [ Reset ]    │
                      └──────────────────────────┘

stopped               ┌──────────────────────────┐
                      │  00:34.50                │
                      │  [ ✓ Use ]  [ ▶ Resume ] │
                      │  [ Reset ]               │
                      └──────────────────────────┘
```

`Use` calls `onUse(elapsedCs)` and resets the widget back to `idle`.

---

## Tasks (SW1 → SW4)

### Phase SW1 · Hook
- [ ] **ST-01** · `useStopwatch` hook + fake-timer unit tests covering: start, stop preserves elapsed, resume continues, reset clears, idle ignores stop/resume, status transitions correct, background-safe (advance system clock without firing rAFs and assert elapsed catches up on next tick).

🔵 **Checkpoint** — hook tests pass; no UI yet

### Phase SW2 · Widget
- [ ] **ST-02** · `StopwatchWidget` component with all 3 states, testIDs on every button (`stopwatch-start`, `-stop`, `-resume`, `-reset`, `-use`, `-display`).
- [ ] **ST-03** · Component tests: render-by-state, button visibility, `onUse` receives correct cs.

### Phase SW3 · Wire-in
- [ ] **ST-04** · Locate the drill-time input component (likely `DrillRow.tsx`) and mount `<StopwatchWidget>` directly beneath it. `onUse` calls the same setter the manual digit pad already uses.
- [ ] **ST-05** · Snapshot-test or interaction-test: existing manual entry path still works identically when the stopwatch widget is present but unused.

### Phase SW4 · E2E + ship
- [ ] **ST-06** · Playwright `stopwatch.spec.ts`: open DrillSheet → Start → wait 2s → Stop → Use → assert displayed time ≈ 2.00 → save → reopen → assert persisted.
- [ ] **ST-07** · Quick visual pass on iOS Safari (touch targets ≥ 44pt, no flicker on tick).

🔵 **Checkpoint** — green; ready to ship

---

## Out of scope (v1)

- Multi-lap / split times — defer until anyone asks
- Audible beep / haptic on start/stop — defer
- Auto-fill which drill the time belongs to — manual still
- Stopwatch state persisting across reloads — explicit non-goal; closing
  the DrillSheet discards the running stopwatch

---

## Risks

1. **rAF throttling under load** — handled by the `Date.now()` baseline pattern. Test covers it.
2. **Existing time-input regressions** — `ST-05` is the lock-in test. If it changes, we know we broke something.
3. **Mobile Safari background timers** — only matters if the user backgrounds the tab mid-swim. Background-safe baseline + on-foreground re-render via `visibilitychange` (already wired for sync; reuse). Add a small note here only if the manual smoke in `ST-07` shows drift.
