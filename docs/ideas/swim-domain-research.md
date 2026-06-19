# Competitive swimming — domain primer for SwimBuddy analytics

A plain-English explainer for the SwimBuddy team. The point of this doc is so we
don't design metrics in a vacuum — every chart, badge, and number in the new
Analytics page should map to something a coach or parent actually thinks about.

---

## 1. How kid swimming progression works

Competitive swimming in most countries starts as "learn-to-swim" at age 4–7,
becomes structured club training at 8–10, and turns into serious age-group
competition at 10–14. Here's the rough arc:

| Age band | What's normal | What parents/coaches watch for |
| --- | --- | --- |
| **6–8** | Learning the four strokes (fly, back, breast, free), water comfort. Local meets occasionally. | Confidence, technique, joy of swimming. Times don't matter yet. |
| **8–10** | First "real" competitions. Short events (25m / 25y per stroke). | First PBs ever — every swim is a PB. Big motivational moment. |
| **10–12** | Build aerobic base. All four strokes equally. Distances grow to 50m and 100m. | Improvement is fast in this band — kids drop seconds per month. Plateaus rare. |
| **12–14** | **Growth-spurt acceleration.** Times improve rapidly due to physical development on top of training. Specialization begins. | Watch for over-specialization too early. Most coaches still want all-rounders here. |
| **14–16** | Race-specific training. Volume goes up. National-level events on horizon. | First real plateaus. Mental side becomes huge. |
| **16–18** | Peak development. College / university recruiting. | Year-to-year improvement is small (tenths of a second). FINA Points growth becomes meaningful. |

**Why this matters for SwimBuddy:**

- A 10-year-old dropping 5 seconds on 50 free is normal — *not* a sign of unusual talent.
- A 16-year-old dropping 0.3 seconds on 50 free is *huge* progress.
- Analytics that just show "X seconds faster" will read as deflating for older
  kids and over-flattering for younger ones. **This is why we need FINA Points**
  — it normalises across age, gender, event, and even course.

---

## 2. Why gender matters (from ~age 11–12 onwards)

Pre-puberty, boys and girls swim at very similar speeds. Puberty changes that:
boys gain muscle mass, lung capacity, and upper-body strength faster, which
matters disproportionately in swimming.

By age 14–18:

- Top male short-distance times are ~8–11% faster than top female equivalents.
- Top female endurance (800m+) times are ~6–8% slower than male equivalents.

**What we do with this:**

- We track gender on the user profile.
- FINA Points has separate base times per gender — built in.
- We never compare male vs female times directly in the UI.
- Age-group standards (later v2) are split by gender.

---

## 3. FINA Points — the universal scoring system

This is the single most important number in competitive swimming and the
single biggest thing SwimBuddy can surface that no other consumer app does.

### What it is

FINA Points is a 0–1000 score that translates *any* swim into a number that's
**comparable across event, distance, gender, and pool type**. It's published
annually by FINA (the world swimming federation, recently renamed *World Aquatics*).

- **1000 points** = current world record for that event/gender/course.
- **900 points** = world / Olympic finalist.
- **800 points** = national senior champion in a strong country.
- **700 points** = national junior champion / strong age-group national level.
- **600 points** = solid regional age-group competitor.
- **500 points** = strong club swimmer.
- **400 points** = developing competitive swimmer.
- **300 points and below** = early/learner level.

The exact bands shift slightly by event, but those tiers are roughly universal.

### How it's calculated

```
Points = 1000 × (BaseTime / SwimTime)³
```

- `BaseTime` is the world-record time for that event/gender/course.
- `SwimTime` is the time of the swim being scored.
- The cube means doubling your time gives you ~125 points instead of 500
  (because 1/2³ = 1/8 = 0.125). The curve is steep at the top and flattens
  out at the bottom.

The current `BaseTime` table covers all standard events × both genders ×
two pool types (SCM = 25m pool, LCM = 50m pool). It's a 80-row JSON file we
keep in `app/lib/analytics/fina-base-times.json` and refresh annually.

### Why it's the right headline for SwimBuddy

- **One number** that grandparents can understand: "her score went from 520 to 562 last month."
- **Already adjusts for** event, distance, gender, and course type. We don't have
  to design four different progress charts.
- **Coaches already use it.** Showing it positions SwimBuddy as serious.
- **Free, public, no licensing.**

### What it *doesn't* do

- It doesn't adjust for age. A 10-year-old hitting 562 points is exceptional;
  a 17-year-old hitting 562 is solid. So we'll layer in age-group context
  later (P5+), but the raw number is still a fine headline.
- It doesn't score non-standard distances like 25m sprints — those are training
  distances, not race events. We'll just count those in volume metrics, not
  in FINA Points.
- It assumes a fresh-from-the-wall race-quality swim. Times posted inside a
  long set will look worse than they should. We may add a "race effort" toggle
  on the drill form later.

---

## 4. Pool types — yards vs metres, short course vs long course

Three pool variants you'll encounter:

| Code | Description | Where used |
| --- | --- | --- |
| **LCM** (Long Course Metres) | 50-metre Olympic pool | International competition, summer championships |
| **SCM** (Short Course Metres) | 25-metre pool | UK / Europe / NZ club training, winter racing |
| **SCY** (Short Course Yards) | 25-yard pool | USA exclusive (high school, college) |

The same swim time means different things in different pools because of the
number of turns (each turn is a small speed boost). Roughly:

- SCM 50 free ≈ LCM 50 free + 0.5s
- SCY is ~10% shorter than SCM, so times are faster mathematically, not just relatively

**What we do:**

- The user picks their default course at onboarding.
- Each session can override the course (rare — they usually train in one pool).
- FINA Points uses the correct base-time table for the selected course.

---

## 5. The events that "count"

Standard FINA-recognised events are these eight distance × stroke combos for
each pool type:

| Distance | Strokes | Notes |
| --- | --- | --- |
| 50m | Free, Back, Breast, Fly | Sprint events, ~25–35s |
| 100m | Free, Back, Breast, Fly | Mid-sprint, ~55–80s |
| 200m | Free, Back, Breast, Fly, IM | "Middle distance", IM = all 4 strokes |
| 400m | Free, IM | Distance + 4-stroke medley |
| 800m | Free | Female championship event |
| 1500m | Free | Male championship event |

Anything else — 25m, 75m, 300m, fly-and-back-only, etc. — is **training-only**
and won't have a FINA score. SwimBuddy still logs them; they just don't
contribute to the FINA tile. They do contribute to volume and streak metrics.

---

## 6. What metrics coaches actually use (beyond FINA)

When coaches review an athlete's log, they look at:

1. **PB freshness.** When was the last PB for each event? A PB drought >6
   weeks for an age-grouper signals plateau (or maybe over-training).
2. **Best-of-3 trend.** PBs are noisy. The average of the top 3 swims in
   the last N weeks is a more honest "current level" line.
3. **Improvement velocity.** Slope of best times per week. Flat = plateau;
   steep negative = peaking; steep positive = regressing.
4. **Stroke balance.** What % of training volume is on each stroke. Most
   coaches want roughly even spread under age 14, even if the kid races
   one stroke. Imbalanced training = injury risk + weak under-stroke in IM.
5. **Test set times.** A "1500 for time" or "10×100 best average" set
   every 4–6 weeks is the truth-teller. These need a label like "test" so
   they're not mixed in with daily training.
6. **Volume distribution by intensity.** Aerobic / threshold / sprint / max.
   Coaches eyeball this via pace per 25m. Needs split capture which we
   don't have yet — defer.
7. **Critical Swim Speed (CSS).** The pace at which you can sustain effort
   indefinitely. Derived from two timed swims of different distance (e.g.
   200 + 400). Coaches use this for setting interval paces. Computable from
   our data once a swimmer has logged both distances at race effort.

SwimBuddy P3 will surface 1, 2, 3, 4 by default. 5 needs a small UI tweak
(label-as-test toggle). 6 needs new data fields. 7 is computable but
should sit behind an "Advanced" toggle so parents aren't confused.

---

## 7. The age-group standards system (deferred to v2)

Most national federations publish *Motivational Time Standards* — tiered
qualifying times for each event per age group. Example (USA Swimming, girls,
12 years old, 50m freestyle, long course):

| Tier | Time |
| --- | --- |
| B | 35.49 |
| BB | 32.79 |
| A | 30.69 |
| AA | 29.19 |
| AAA | 27.79 |
| AAAA (Olympic Trials cut) | 26.59 |

**Why we're not doing this in v1:** the dataset is per-federation per-year per-
gender per-age. USA Swimming, British Swimming, Swimming NZ, Swimming Australia
all publish slightly different cuts. We'd need to decide whose standards to
show, refresh them annually, and design UX for the "you just hit AA!" moment.
That's a quarter of an engineer's time on its own.

**Why we *do* want it eventually:** for a competitive 14-year-old, "I hit my
A cut!" is *the* milestone. FINA Points alone won't surface that feeling.

Bring this in P5 once FINA Points is in place and we've validated the
headline-number approach.

---

## 8. Practical implications for the SwimBuddy data model

The current schema (Session → Drill → strokeId, distance, timeCs) can't
support FINA Points correctly without two additions:

1. **On the user profile:** `birthYear` (or DOB), `gender` (male / female /
   prefer-not-to-say), `defaultCourse` (LCM / SCM / SCY).
2. **On the session:** `course` (overrides default; usually omitted). Or skip
   this and only support the default course initially.

We can ship P0 (FINA tile + PB toast) without `birthYear` because FINA Points
isn't age-adjusted anyway. We *do* need `gender` and `course` for accurate
scoring.

If we want a quick first cut without any onboarding flow, we could default to:

- `gender`: prompt only when the user opens the tile for the first time.
- `course`: assume LCM (most international users) unless told otherwise.

This keeps P0 zero-friction; the explicit onboarding lands in P1.

---

## 9. What this means for the parent's mental model

The grand vision: **the parent should never need to understand any of this.**

What they should see, in order of frequency:

1. **One headline number that goes up over time.** That's FINA Points.
2. **Celebratory moments when something genuinely good happens.** PB toasts +
   milestone cards in the feed.
3. **A "what changed this week" digest if they didn't open the app.** Weekly
   notification.
4. **A way to drill in once a month or so to study trends.** Analytics tab.

Everything else — pool type, age-grade, world records, base tables — should
be plumbing that runs underneath. If a parent ever has to read this document
to use the app, we've failed.
