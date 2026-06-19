# Home-as-Feed + Analytics — SwimBuddy roadmap

**Status:** Refined idea + branch with mockup.
**Branch:** `feat/analytics-mock`
**Companion docs:** [`swim-domain-research.md`](./swim-domain-research.md) · [`analytics-mock.html`](./analytics-mock.html)
**Created:** 2026-06-19

## Problem Statement

**How might we** turn SwimBuddy from a "log of sessions" into a *signal* — so parents instantly grasp whether their kid is improving, and serious coaches see real depth without parents drowning?

## The shift

The current Home is a chronological list of session cards. The new shape is:

- **Home becomes a feed.** Mixed stream of session cards + milestone cards (PBs, streaks, biggest deltas), with a **pinned FINA Points tile** at the top — the "is the number going up?" headline.
- **Analytics is a separate tab.** Replaces the under-used Explore tab. Holds the depth: line charts, per-event trends, advanced metrics. Optional for parents, required for coaches.
- **FINA Points is the universal currency.** A single 0–1000 score normalizes performance across stroke, distance, gender, and (with the table choice) course type. Parents only need one number to track.

See `swim-domain-research.md` for the underlying domain knowledge that drove these choices — what FINA Points actually is, how age-group standards work, how kid development progresses, and why gender matters from puberty onwards.

## App dynamics — the three rooms

Every app has rhythm. SwimBuddy's:

| Room | Job | Frequency | Tone |
| --- | --- | --- | --- |
| **Home (feed)** | Pulse check — "what changed since I last looked?" | Daily | Celebratory, scannable |
| **Session screen** | Capture — log this practice | Per-session, mid-task | Fast, distraction-light |
| **Analytics tab** | Study — "show me the trend, the truth" | Weekly | Honest, chart-heavy |

Settings is a fourth room, but it's plumbing (sharing, export, sign-out) — not part of the daily loop.

## Smallest-first phasing

Each phase ships value independently. Don't build all of it at once.

| Phase | What ships | Effort | Learns |
| --- | --- | --- | --- |
| **P0 — PB toast + FINA tile** | (a) `lib/analytics.ts` with `findPB(stroke, distance)` + `finaPoints(event, time, gender, course)`. (b) Toast on drill save when it's a new PB. (c) One pinned FINA tile above the existing Home list. | ~2 days | Do parents react to milestone toasts? Is FINA Points the right headline? |
| **P1 — Onboarding for age + gender + course** | Profile completion flow on first sign-in (or first FINA tile interaction): birth year, gender, default course type. Stored on user profile. | ~1 day | What % of users complete it? Friction point? |
| **P2 — Home as a feed** | Interleave milestone cards with sessions. Pinned tile stays. Empty/cold-start state. "Just sessions" toggle for opt-out. | ~3 days | Does feed shape drive opens? Do parents share milestones? |
| **P3 — Analytics tab** | Replace Explore. Per `(stroke × distance)` line chart, FINA Points history, "best of 3" smoothing, stroke-balance bars. | ~1 week | Do parents drill in? Do coaches install? |
| **P4 — Digest + share images** | Sunday-night digest notification. PNG export of milestone cards for sharing. | ~3 days | Notification opt-in rate; share rate |
| **P5+ — Goals, age-group standards, leaderboard** | Deferred per the "Not Doing v1" list. Revisit after P0–P4 + 1 month of usage data. | — | — |

## Key assumptions to validate

1. **FINA Points is legible to parents.** Show a non-swimmer parent a "562" + arrow. Do they grasp "higher = better"? Should we render it as `562`, `Solid AG` (a label band), or both?
2. **Most drills are FINA-scorable distances.** Sample your last 30 drills locally. If 25m short sprints dominate, FINA only covers a fraction. We may need a "training distance" carveout or skip scoring those swims (just count them in volume).
3. **Parents will fill out the age/gender/course profile.** Without it, FINA Points can't be accurate. Friction point — needs to feel like a 10-second flow.
4. **A pinned FINA tile drives opens.** Instrument tile views and PB-toast taps after P0.
5. **The feed shape doesn't bury the chronological reality.** Track the "just sessions" toggle rate. If 30%+ flip it, the feed shape is wrong.
6. **FINA Points pulls coaches in.** Test with one real coach when P3 lands.

## What I'm choosing to ignore (and why)

- **Algorithmic feed ranking.** Strict reverse-chronological with milestones anchored to their event date. Parents trust what they see.
- **Goal-forecasting models.** Small-N swim time series projection is statistically noisy.
- **Cross-stroke comparison via line charts.** FINA Points is the right abstraction.
- **Custom dashboards.** Premature complexity.
- **Stroke rate / DPS / underwater time.** Not currently captured; defer until we add stroke metrics to drill capture.

## Not Doing in v1 (and why)

- **Leaderboards / peer comparison.** Family-dynamics risk inside small circles; user base too small for anonymous global to be interesting. Revisit at ~100+ active families with explicit opt-in.
- **Age-group standards (USA-S, FINA AA cuts).** Needs benchmark dataset wiring + UX. FINA Points serves a similar "where do I sit on the universal scale" purpose. Bring this in P5+.
- **Goal tracking + forecasting.** Ship retrospective insight first.
- **Critical Swim Speed, predicted race time.** Coach-grade; defer to P3's "Advanced" toggle once FINA Points proves it pulls coaches.

## Open questions

- **Chart library.** Victory Native ~150kB, Recharts ~250kB. Or roll an 80-line SVG line chart and avoid the dep. Decide at P3.
- **Tab placement.** Replace Explore with Analytics — confirm Explore isn't being used via instrumentation before removing.
- **PB toast batching.** If 5 PBs happen in one save (backfill), do we show 5 toasts, one combined card, or queue them? Lean: one combined card with a list.
- **FINA for short-course yards vs SCM vs LCM.** Same formula, different base times per course. Per-session course attribute needed.
- **Per-swimmer analytics when viewing a shared log.** Extends `selectedOwnerId` filter — no new auth work. Verify during P3 build.

## References

- Domain research: [`swim-domain-research.md`](./swim-domain-research.md)
- Interactive mockup: [`analytics-mock.html`](./analytics-mock.html) — open in a browser, three annotated screens
