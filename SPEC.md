# SPEC: F2 lead scoring and call list (F2-AC5 to F2-AC8)

| | |
|---|---|
| **Issue** | #7, "F2 lead scoring and call list (F2-AC5 to F2-AC8)" |
| **Branch** | `feat/7-lead-scoring` (from `origin/dev`), PR targets `dev` |
| **Written** | Nov 19, 2026, from an AskUserQuestion interview with Najib (2 rounds, 8 questions) |
| **Course step** | HW4 Part 2: this file is committed before any implementation commit. Then `/clear`, and Explore, Plan, Implement, Commit from this spec alone. |

## 1. Goal

Build two pure TypeScript modules that ClosePath agents will rely on:

1. **Lead scoring:** turn a lead's buyer activity into a score from 0 to 100 and a band (Hot, Warm, Cold), so agents call the leads most likely to buy first.
2. **Today's call list:** pick up to 10 open leads that nobody has contacted today, in a fixed order.

The modules are business rules only: no database, no network, no clock, no UI. Callers pass `now`. They are built test-first (red, green, refactor), and every test name starts with its acceptance criterion ID.

## 2. Context you need

ClosePath is a Next.js 16 app for one small real estate brokerage. Its time zone is **`America/Los_Angeles`**. A **lead** is a person who asked about homes; an agent works it. Pure business rules live in `src/lib/domain/` (ADR-5 in `docs/architecture.md`).

**Lead statuses** (PRD F2-AC4): `NEW`, `CONTACTED`, `SHOWING`, `UNDER_CONTRACT`, `CLOSED`, `LOST`. The **open** statuses are `NEW`, `CONTACTED` and `SHOWING`.

**Showing statuses** (F5, data model): `REQUESTED`, `CONFIRMED`, `DECLINED` (by the agent), `CANCELLED` (by the buyer).

**The PRD rules this spec implements:**

- **F2-AC5:** score from 0 to 100:

  | Signal | Points |
  |---|---|
  | Most recent buyer activity (inquiry, saved home, showing request) is 1 day old or less / 7 days or less / 30 days or less / older | 30 / 20 / 10 / 0 |
  | Has requested a showing that was not cancelled | +25 |
  | Saved homes | +5 each, up to +15 |
  | "Request info" submissions | +10 each, up to +20 |
  | Gave a phone number | +10 |
  | Status is `CLOSED` or `LOST` | Score is 0 |

- **F2-AC6:** bands are Hot (70 to 100), Warm (40 to 69) and Cold (0 to 39).
- **F2-AC7:** today's call list shows up to 10 open leads that have not been contacted today, ordered by score (highest first); ties go to the lead contacted longest ago, and never-contacted leads come first.
- **F2-AC8:** scoring is deterministic: the same lead at the same time always gets the same score, and the score is always between 0 and 100.

## 3. Decisions from the interview

These fill the gaps the PRD leaves open. They are binding for this feature.

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | How are the recency windows measured? | **Elapsed time.** Age = `now - latest activity` in milliseconds. 1 day = 24 hours, 7 days = 168 hours, 30 days = 720 hours. Boundaries are inclusive (exactly 7 days old earns 20). | No daylight-saving bugs, and scores don't jump at midnight. |
| D2 | What does "contacted today" mean? | **Same calendar date in `America/Los_Angeles`.** A call at 11:30pm yesterday (LA time) does not hide the lead this morning. | Matches the agent's workday. A rolling 24 hours would hide a lead called at 4pm yesterday until 4pm today. |
| D3 | Which showing requests earn +25? | **Any request whose status is not `CANCELLED`:** `REQUESTED`, `CONFIRMED` or `DECLINED`. Awarded once, however many requests there are. | The literal PRD text. A decline is the agent's choice (for example, a conflict), and the buyer still wants to see the home. |
| D4 | Does a cancelled request count as recent activity? | **Yes.** Every showing request, cancelled or not, counts as buyer activity on its request date. Only the +25 is withheld. | The request still shows the buyer was active then. |
| D5 | What shape is the scoring input? | **Raw event lists** (`inquiries`, `savedHomes`, `showingRequests`), not pre-counted numbers. Plain types, not Prisma models. | All the counting, caps and recency logic sits in the domain code, where it gets unit, property and mutation tests. |
| D6 | Is the score stored? | **No. It is computed when it's read.** There is no `score` column. | Recency decays as time passes, so a stored score goes stale between events. Computing on read makes F2-AC8 hold by construction. |
| D7 | What sets `lastContactedAt`? | **Only agent actions:** a logged call, or the agent changing the status to `CONTACTED` (F2-AC4). The F3 auto-reply and follow-up emails **never** set it. | F3-AC1 auto-replies to every new lead at once. If emails counted, every new website lead would drop off today's call list the moment it arrived, and E2E flow 1 in `docs/testing.md` ("the agent sees the new lead at the top of the call list") would fail. |
| D8 | Tie-break after score and `lastContactedAt`? | **`createdAt` ascending** (the lead who has waited longest), **then `id` ascending** (plain string comparison, not locale-aware). | A total, deterministic order, like the `id` tie-break in `src/lib/domain/listing-search.ts`. |

Smaller rules decided while writing the spec:

- **Phone:** a lead "gave a phone number" when `phone` is not `null` and not blank after trimming. Format checks belong to the "Request info" form schema (F1-AC8), not here.
- **No buyer activity:** recency is 0 points (the other signals still count, so a lead with only a phone number scores 10).
- **Activity after `now`** (clock skew between servers): treated as age 0, so it earns 30 recency points. It still counts toward saved-home and inquiry totals.
- **`UNDER_CONTRACT`** leads are scored normally. They are left off the call list only because they are not open.
- **`lastContactedAt` after `now`** on the same or a later LA date counts as contacted today (the lead is left off).
- **Agent actions are not buyer activity.** Notes, calls, emails and status changes never affect recency.

## 4. Files

| File | What it holds |
|---|---|
| `src/lib/domain/lead-scoring.ts` | Types, `scoreLead()`, `scoreBand()` (F2-AC5, F2-AC6, F2-AC8) |
| `src/lib/domain/lead-scoring.test.ts` | Example tests for F2-AC5, F2-AC6 and the clock-independence test for F2-AC8 |
| `src/lib/domain/lead-scoring.property.test.ts` | fast-check property tests for F2-AC8 (and "more activity never lowers the score", F2-AC5) |
| `src/lib/domain/call-list.ts` | `isContactedToday()`, `buildCallList()` (F2-AC7) |
| `src/lib/domain/call-list.test.ts` | Example tests for F2-AC7 |
| `src/lib/domain/call-list.scenario.test.ts` | The end-to-end scenario in section 11 (F2-AC5 to F2-AC7 together) |
| `package.json`, `package-lock.json` | `fast-check@4` as a dev dependency (section 9, step 2) |

No other files change, apart from docs and session logs.

## 5. Interfaces

### `src/lib/domain/lead-scoring.ts`

```ts
export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "SHOWING",
  "UNDER_CONTRACT",
  "CLOSED",
  "LOST",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SHOWING_STATUSES = [
  "REQUESTED",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
] as const;
export type ShowingStatus = (typeof SHOWING_STATUSES)[number];

export const SCORE_BANDS = ["HOT", "WARM", "COLD"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

/** Everything the score depends on. The DAL builds this from database rows. */
export type LeadScoreInput = {
  status: LeadStatus;
  phone: string | null;
  /** Every "Request info" submission for this lead, including the one that created it. */
  inquiries: readonly { at: Date }[];
  /** Homes the lead's buyer account has saved right now (an unsave removes one). */
  savedHomes: readonly { savedAt: Date }[];
  /** Every showing request by the lead's buyer account, in any status. */
  showingRequests: readonly { requestedAt: Date; status: ShowingStatus }[];
};

/** Integer from 0 to 100. Pure: reads nothing but its arguments. */
export function scoreLead(lead: LeadScoreInput, now: Date): number;

/** HOT for 70 to 100, WARM for 40 to 69, COLD for 0 to 39. */
export function scoreBand(score: number): ScoreBand;
```

### `src/lib/domain/call-list.ts`

```ts
import type { LeadStatus } from "@/lib/domain/lead-scoring";

export const CALL_LIST_SIZE = 10;
export const BROKERAGE_TIME_ZONE = "America/Los_Angeles";
export const OPEN_STATUSES = [
  "NEW",
  "CONTACTED",
  "SHOWING",
] as const satisfies readonly LeadStatus[];

/** The fields the call list needs. `score` comes from scoreLead(). */
export type CallListCandidate = {
  id: string;
  status: LeadStatus;
  score: number;
  lastContactedAt: Date | null;
  createdAt: Date;
};

/** True when lastContactedAt falls on now's calendar date in LA, or later. */
export function isContactedToday(lastContactedAt: Date | null, now: Date): boolean;

/**
 * Today's call list: at most CALL_LIST_SIZE open leads not contacted today, in
 * call order. Generic so callers can pass extra fields (name, band) through.
 * Returns a new array and never reorders or mutates the input.
 */
export function buildCallList<T extends CallListCandidate>(
  leads: readonly T[],
  now: Date,
): T[];
```

## 6. Rules

### `scoreLead(lead, now)`

1. If `status` is `CLOSED` or `LOST`, return 0.
2. **Recency:** collect every `inquiries[].at`, `savedHomes[].savedAt` and `showingRequests[].requestedAt` (all showing statuses, D4). If there are none, recency is 0. Otherwise take the latest timestamp, and let `age = max(0, now - latest)` in milliseconds. Points: `age <= 1 day` gives 30, `<= 7 days` gives 20, `<= 30 days` gives 10, otherwise 0 (D1).
3. **Showing:** +25 if at least one showing request has a status other than `CANCELLED` (D3). Only once.
4. **Saved homes:** `min(5 * savedHomes.length, 15)`.
5. **Inquiries:** `min(10 * inquiries.length, 20)`.
6. **Phone:** +10 if `phone !== null && phone.trim() !== ""`.
7. Return the sum. The maximum is 30 + 25 + 15 + 20 + 10 = **100**, and every part is a non-negative integer, so the range holds by construction. Don't add a clamp that no test can reach.

Use named constants for the points (for example `SHOWING_POINTS = 25`, `DAY_MS = 86_400_000`). Tests use the literal numbers from the PRD, not the constants, so a wrong constant fails a test.

### `scoreBand(score)`

`score >= 70` gives `HOT`, `score >= 40` gives `WARM`, anything else gives `COLD`.

### `isContactedToday(lastContactedAt, now)`

- `null` gives `false`.
- Otherwise, turn both dates into an LA calendar date (`YYYY-MM-DD`) with one module-level `Intl.DateTimeFormat("en-US", { timeZone: BROKERAGE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })` and `formatToParts`. Return `true` when the date of `lastContactedAt` is the same as, or later than, the date of `now` (D2). Never use `getUTCDate()`, a fixed UTC offset, or a rolling 24 hours.

### `buildCallList(leads, now)`

1. Keep leads whose `status` is in `OPEN_STATUSES` and where `isContactedToday(lead.lastContactedAt, now)` is `false`.
2. Sort a copy by:
   1. `score`, highest first;
   2. `lastContactedAt`: `null` (never contacted) first, then the oldest first;
   3. `createdAt`, oldest first (D8);
   4. `id`, ascending by plain `<` comparison (D8).
3. Return the first `CALL_LIST_SIZE` (10).

The input is already one agent's leads. Picking them is the DAL's job (F2-AC1), not this function's.

### Code conventions (from `CLAUDE.md`)

Named exports only. `type`, not `interface`. No `any`, no `!` outside tests, no `Date.now()` or argument-less `new Date()` in domain code. No Prisma or `fetch` imports. Use the `@/` alias for imports. Follow the style of `src/lib/domain/listing-search.ts`: a short header comment, `as const` arrays for enums, small helpers.

## 7. Contract for later features (not built here)

These are recorded so the DAL and UI work later in Sprint 1 matches this spec:

- **Scores are computed on read** (D6). The `/agent/leads` loader does this:

  ```ts
  const scored = leads.map((lead) => {
    const score = scoreLead(toScoreInput(lead), now);
    return { ...lead, score, band: scoreBand(score) };
  });
  const callList = buildCallList(scored, now);
  ```

- **`lastContactedAt`** is set only by a logged call or a status change to `CONTACTED` (D7). F3 emails never set it.
- **`inquiries`** are every "Request info" submission, so the repeat activity that F1-AC9 adds within 24 hours counts as another inquiry.
- **`savedHomes` and `showingRequests`** come from the lead's buyer account. How a lead is linked to an account (for example, by email) is decided with the DAL. A lead with no account passes `[]` for both.

## 8. Tests

Use Vitest (`describe`, `it`, `it.each`) and a fixture factory per file, like `makeListing(id, overrides)` in `listing-search.test.ts`. Use a fixed `NOW = new Date("2026-11-19T18:00:00.000Z")` (10:00am in LA, standard time) and helpers `HOUR`, `DAY` and `ago(ms)`. All data is fictional. Every test name starts with its AC ID.

### `lead-scoring.test.ts`

**F2-AC5:**

- Recency boundaries, table-driven. Use a lone `CANCELLED` showing request, which adds recency but no other points, so the score is the recency points alone:

  | Age of the request | Expected |
  |---|---|
  | 0 | 30 |
  | exactly 1 day | 30 |
  | 1 day + 1 ms | 20 |
  | exactly 7 days | 20 |
  | 7 days + 1 ms | 10 |
  | exactly 30 days | 10 |
  | 30 days + 1 ms | 0 |

- The latest of all three activity kinds is used (an old inquiry plus a saved home from 2 hours ago gives 30 recency points).
- Activity after `now` earns 30 recency points.
- No activity at all: recency is 0; with only a phone number, the score is 10.
- Showing bonus: +25 for `REQUESTED`, `CONFIRMED` and `DECLINED`; nothing for `CANCELLED` alone; two live requests still give +25 once.
- Saved homes: 1 gives 5, 3 give 15, 4 give 15.
- Inquiries: 1 gives 10, 2 give 20, 3 give 20.
- Phone: `"555-0100"` gives +10; `null`, `""` and `"   "` give 0.
- `CLOSED` and `LOST` score 0 even with every signal at its maximum. `UNDER_CONTRACT`, `NEW`, `CONTACTED` and `SHOWING` are scored normally.
- A lead with every signal at its maximum scores exactly 100.

**F2-AC6:** `scoreBand` for 0 and 39 gives `COLD`, 40 and 69 give `WARM`, 70 and 100 give `HOT`.

**F2-AC8:** the score does not depend on the system clock. Score the same lead with `vi.useFakeTimers()` and `vi.setSystemTime()` set to two very different instants; the results are equal. Restore real timers afterward.

### `lead-scoring.property.test.ts` (fast-check)

Arbitraries: `status` from `LEAD_STATUSES`; `phone` from `fc.option(fc.string(), { nil: null })`; each list from 0 to 6 items; dates from `fc.date({ min: new Date("2025-01-01T00:00:00Z"), max: new Date("2027-12-31T00:00:00Z"), noInvalidDate: true })`; showing status from `SHOWING_STATUSES`.

- **F2-AC8:** for any lead and `now`, the score is an integer from 0 to 100.
- **F2-AC8:** scoring the same lead at the same `now` twice, and scoring a `structuredClone` of it, gives the same result, and the input is not mutated.
- **F2-AC5:** adding one saved home or one inquiry, with any date, never lowers the score.

### `call-list.test.ts`

**F2-AC7:**

- `NEW`, `CONTACTED` and `SHOWING` leads are included; `UNDER_CONTRACT`, `CLOSED` and `LOST` are left out.
- LA date boundary, with `now` = `NOW`: `lastContactedAt` at `2026-11-19T07:59:59.999Z` (11:59:59pm yesterday in LA) is **included**; at `2026-11-19T08:00:00.000Z` (midnight today in LA) it is **left out**. A `lastContactedAt` later than `now` is left out.
- `isContactedToday(null, NOW)` is `false`.
- Higher scores come first.
- With equal scores, never-contacted leads come first, then the lead contacted longest ago.
- With equal score and `lastContactedAt`, the older `createdAt` comes first. With those equal too, the smaller `id` comes first.
- 11 eligible leads give 10; the lowest is dropped. Fewer than 10 give all of them. An empty input gives `[]`.
- The input array keeps its order, and the returned items are the same objects, with extra fields kept.

## 9. Build order and commits

1. **Get Vitest.** Najib reviews and merges Parker's PR #5 into `dev`; it adds Vitest, `vitest.config.mts` and `src/lib/domain/listing-search.ts`. Then run `git fetch` and `git merge origin/dev` on this branch, then `npm ci`.
2. **Add fast-check.** Run `npm view fast-check dist-tags` and confirm `latest` is a stable 4.x (it was 4.10.3 on Nov 19, 2026), then `npm install -D fast-check@4`. Commit: `chore(test): add fast-check for property tests`. The PR explains the new dependency (OWASP A03): it is dev-only and planned in `docs/testing.md`.
3. **`/clear`**, then Explore (Glob, Grep, Read), then Plan in Plan mode (take a screenshot), then implement.
4. **TDD commits.** Each red commit must fail because the behavior is missing, through a stub that throws `new Error("not implemented")`, never because of an import or syntax error. Never edit a test during a green step.

   | # | Commit |
   |---|---|
   | 1 | `test(scoring): F2-AC6 add failing tests for score bands (red)`, with `lead-scoring.ts` holding the types and throwing stubs |
   | 2 | `feat(scoring): F2-AC6 map scores to Hot, Warm and Cold bands (green)` |
   | 3 | `test(scoring): F2-AC5 add failing tests for the score rules (red)` |
   | 4 | `test(scoring): F2-AC8 add failing property tests for range and determinism (red)`. These tests must be committed **before** `scoreLead` is implemented. A property test written after the green step can never show a red step. |
   | 5 | `feat(scoring): F2-AC5 F2-AC8 score leads from recency, showings, saves, inquiries and phone (green)` |
   | 6 | `refactor(scoring): ...` (for example, extract `recencyPoints` and `cappedPoints`) |
   | 7 | `test(call-list): F2-AC7 add failing tests for today's call list (red)`, with a throwing stub in `call-list.ts` |
   | 8 | `feat(call-list): F2-AC7 build today's call list (green)` |
   | 9 | `refactor(call-list): ...` if needed |
   | 10 | `test(call-list): F2-AC5 to F2-AC7 add the end-to-end scenario (section 11)`. This test checks that the modules work together, so it is expected to pass on its first run. Step 5 of section 11 proves it can fail. |

5. Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push or open the PR without asking.

## 10. Out of scope

- The `/agent/leads` page, the call list UI, score badges and any React components (F2-AC2).
- F2-AC1 to F2-AC4: access control, the lead list and its filters, the timeline, notes, logged calls and status changes, including the code that sets `lastContactedAt`. Only its meaning is fixed here (D7).
- The Prisma schema, models and migrations, the DAL, Server Actions, and how a lead is linked to a buyer account.
- Storing scores: no `score` column and no recompute job (D6).
- Validating lead data with Zod. The phone format is checked by the "Request info" form (F1-AC8).
- F3 emails, F4 routing and F5 showing logic. This feature only reads showing statuses.
- Stryker mutation testing. It runs once per sprint (`docs/testing.md`); this code is written to be mutation-testable, but no Stryker config is added here.
- Seed data and real people's data. Test fixtures use made-up ids and `555-01xx` phone numbers.

## 11. End-to-end verification

There is no UI yet, so the proof is a scenario test that runs `scoreLead`, `scoreBand` and `buildCallList` together on one agent's morning: 12 fictional leads at `NOW = 2026-11-19T18:00:00.000Z` (10:00am Thursday in LA, standard time).

### The scenario (`src/lib/domain/call-list.scenario.test.ts`)

Ages are measured back from `NOW` ("3d" means `ago(3 * DAY)`). `createdAt` equals the oldest inquiry.

| id | status | phone | inquiries | saved homes | showing requests | lastContactedAt | Score | Band |
|---|---|---|---|---|---|---|---|---|
| lead-01 | NEW | 555-0101 | 2h, 26h, 3d | 3h, 5h, 1d, 2d | REQUESTED, 1h | null | 100 | HOT |
| lead-02 | CONTACTED | null | exactly 7d | none | none | 1d | 30 | COLD |
| lead-03 | SHOWING | `"   "` | 10d | none | DECLINED, 2d | 2d | 55 | WARM |
| lead-04 | NEW | 555-0104 | 10d | none | CANCELLED, 4h | null | 50 | WARM |
| lead-05 | CONTACTED | 555-0105 | 3d | none | none | `2026-11-19T07:30:00Z` (11:30pm yesterday in LA) | 40 | WARM |
| lead-06 | NEW | 555-0106 | 3d | none | none | null | 40 | WARM |
| lead-07 | CONTACTED | 555-0107 | 2d | 2d | none | `2026-11-19T08:30:00Z` (12:30am today in LA) | 45 | WARM |
| lead-08 | CLOSED | 555-0108 | 1h | none | CONFIRMED, 1h | null | 0 | COLD |
| lead-09 | UNDER_CONTRACT | 555-0109 | exactly 1d | none | CONFIRMED, 5d | null | 75 | HOT |
| lead-10 | NEW | null | 31d | none | none | null | 10 | COLD |
| lead-11 | CONTACTED | 555-0111 | exactly 30d | none | none | 3d | 30 | COLD |
| lead-12 | NEW | null | 40d | none | none | null | 10 | COLD |

The test asserts every lead's score and band (the last two columns). It then asserts that `buildCallList` returns exactly these ids, in this order:

| # | id | Score | Band | Why it is here |
|---|---|---|---|---|
| 1 | lead-01 | 100 | HOT | Every signal at its cap (4 saves give 15, 3 inquiries give 20) |
| 2 | lead-03 | 55 | WARM | A declined showing still gives +25; a blank phone gives 0 |
| 3 | lead-04 | 50 | WARM | A cancelled showing gives no +25 but still sets recency (4h, so 30 points) |
| 4 | lead-06 | 40 | WARM | Ties with lead-05; never contacted comes first |
| 5 | lead-05 | 40 | WARM | Last contact was yesterday in LA, though it's the same date in UTC |
| 6 | lead-11 | 30 | COLD | Ties with lead-02; contacted 3 days ago comes before 1 day ago |
| 7 | lead-02 | 30 | COLD | Exactly 7 days old still earns 20 |
| 8 | lead-12 | 10 | COLD | Ties with lead-10; created 40 days ago comes before 31 |
| 9 | lead-10 | 10 | COLD | Older than 30 days, so 0 recency points |

Left off: **lead-07** (contacted today in LA), **lead-08** (`CLOSED`, score 0) and **lead-09** (`UNDER_CONTRACT`, scored 75 but not open). Orders 4, 6 and 8 go against `id` order, so they prove the tie-break rules and not just the `id` fallback.

### Steps

1. `npm run lint`: no errors and no warnings.
2. `npm run typecheck`: no errors.
3. `npx vitest run src/lib/domain --reporter=verbose`: every test passes, and the F2 test names start with `F2-AC5`, `F2-AC6`, `F2-AC7` or `F2-AC8`, with all four IDs present.
4. `npm run test:coverage`: the 70% thresholds pass, and `lead-scoring.ts` and `call-list.ts` have at least 90% line and branch coverage.
5. **Prove the scenario can fail.** Temporarily make `isContactedToday` compare UTC dates (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`). Run the scenario test and confirm that it fails because lead-05 is missing. Then revert, and don't commit the change. Note the result in the session log.
6. `git log --oneline origin/dev..HEAD` shows the `docs(spec)` commit for this file first, then the red, green and refactor commits from section 9.

The feature is done when steps 1 to 6 pass and the results are recorded in the PR description.
