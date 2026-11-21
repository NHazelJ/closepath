<!--
HW4 Part 2 evidence: the plan Claude Code proposed in Plan mode and Najib approved
on Nov 19, 2026, in the session "HW4 Part 2: build F2 scoring from SPEC.md (#7)".
It was written after the Explore phase and before any code. Copied unchanged from
Claude Code's plan file. Plan mode screenshots: docs/screenshots/hw4-part2-plan-mode-*.png.
The whole build session: docs/screenshots/hw4-part2-build-*.png
-->

# Plan: F2 lead scoring and call list (issue #7, SPEC.md)

## Context

`SPEC.md` asks for two pure domain modules: `scoreLead` / `scoreBand` (F2-AC5, F2-AC6, F2-AC8) and `isContactedToday` / `buildCallList` (F2-AC7). Both are built test-first in the 10 commits of SPEC §9 step 4. The branch `feat/7-lead-scoring` already has the `docs(spec)` and `chore(test): add fast-check` commits on top of `origin/dev`. The outcome is lint-clean, typed and tested code, proven by the §11 scenario.

**What exploration found:**

- **Pattern to follow:** `src/lib/domain/listing-search.ts` and `listing-search.test.ts`: a header comment, `as const` enums, small helpers, a `makeX(id, overrides)` factory, `it.each` tables, and an `id` tie-break with plain `<`.
- **Test setup:** `vitest.config.mts` includes `src/**/*.test.ts`, so the `*.property.test.ts` and `*.scenario.test.ts` files run with no config change. Coverage covers `src/**/*.ts`.
- **Versions:** fast-check 4.10.3, Vitest 5.1.1, TypeScript 5.9.3, Node 24. Prettier isn't installed, so I match the existing style by hand. There are no git hooks.
- **Stubs:** ESLint warns on unused parameters and has no `_` exemption. So each stub throws `new Error("not implemented", { cause: { lead, now } })`. The message is the one the spec gives, and passing the arguments as `cause` keeps every red commit free of lint warnings and type errors. A red test can then only fail at runtime, on the stub.

## Commits (SPEC §9 step 4)

Before each **red** commit: run the tests and show they fail with `not implemented`, and run `typecheck` to show there's no import or type error. Before each **green** or **refactor** commit: run the tests (all pass), and run `git diff --cached --stat` to show no test file changed.

| # | Commit | Files | What goes in |
|---|---|---|---|
| 1 | `test(scoring): F2-AC6 add failing tests for score bands (red)` | `lead-scoring.ts`, `lead-scoring.test.ts` | Types and `as const` arrays from §5; throwing stubs for `scoreLead` and `scoreBand`; `it.each` for 0 and 39 (COLD), 40 and 69 (WARM), 70 and 100 (HOT) |
| 2 | `feat(scoring): F2-AC6 map scores to Hot, Warm and Cold bands (green)` | `lead-scoring.ts` | `scoreBand` with `HOT_MIN = 70`, `WARM_MIN = 40` |
| 3 | `test(scoring): F2-AC5 add failing tests for the score rules (red)` | `lead-scoring.test.ts` | Every F2-AC5 bullet in §8: the recency boundary table, latest activity across kinds, activity after `now`, no activity, showing bonus, saved-home and inquiry caps, phone, statuses, max = 100 |
| 4 | `test(scoring): F2-AC8 add failing property tests for range and determinism (red)` | `lead-scoring.property.test.ts`, `lead-scoring.test.ts` | The 3 fast-check properties in §8, plus the F2-AC8 fake-clock test in `lead-scoring.test.ts` (it is about determinism, so it goes here rather than in #3) |
| 5 | `feat(scoring): F2-AC5 F2-AC8 score leads from recency, showings, saves, inquiries and phone (green)` | `lead-scoring.ts` | `scoreLead` per §6, inline, with named point constants and `DAY_MS` |
| 6 | `refactor(scoring): extract recencyPoints and cappedPoints` | `lead-scoring.ts` | A recency tier table with `recencyPoints`, plus `cappedPoints`, `latestActivityTime` and `hasPhone` |
| 7 | `test(call-list): F2-AC7 add failing tests for today's call list (red)` | `call-list.ts`, `call-list.test.ts` | Constants and type from §5, throwing stubs, every F2-AC7 bullet in §8 |
| 8 | `feat(call-list): F2-AC7 build today's call list (green)` | `call-list.ts` | A module-level LA `Intl.DateTimeFormat` with `formatToParts`, compared as `YYYY-MM-DD` strings with `>=`; filter, then sort the copy, then take 10 |
| 9 | `refactor(call-list): extract the call-order comparator` | `call-list.ts` | `laDateKey`, an `ascending` helper and `compareCallOrder` |
| 10 | `test(call-list): F2-AC5 to F2-AC7 add the end-to-end scenario (section 11)` | `call-list.scenario.test.ts` | The 12-lead table: asserts every score and band, then the exact 9-id order. Expected to pass on its first run |

Every commit stages only its named files (`.claude/launch.json` stays untracked) and ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The commit email is already the GitHub noreply address.

## Test design notes

- **Fixtures:** `NOW = 2026-11-19T18:00:00.000Z`, plus `HOUR`, `DAY` and `ago(ms)`. `makeLead(overrides)` defaults to a `NEW` lead with no phone and empty lists, which scores 0. `OLD = ago(60 * DAY)` is activity too old for recency points, so each test isolates one signal. A `MAXED` lead scores exactly 100.
- **Mutation-resistant cases:**
  - The latest-activity test is a table over which kind is recent, and the recent item is not first in its array.
  - The "or later" date rule is tested with a contact 2 days after `now` (this catches `===` instead of `>=`).
  - Each sort test passes its input in the opposite of the expected order.
- **Clock test:** it also asserts that `Date.now()` returns the faked time, so it can't pass by accident if fake timers don't take effect. `afterEach` restores the real timers.
- **Tests use the PRD's literal numbers,** never the module's constants.

## Verification (SPEC §11)

1. `npm run lint`: 0 errors and 0 warnings.
2. `npm run typecheck`: 0 errors.
3. `npx vitest run src/lib/domain --reporter=verbose`: everything passes, and F2-AC5, F2-AC6, F2-AC7 and F2-AC8 all appear in test names.
4. `npm run test:coverage`: the 70% thresholds pass, and `lead-scoring.ts` and `call-list.ts` have at least 90% line and branch coverage.
5. **Prove the scenario can fail:** temporarily switch `isContactedToday` to UTC dates, run the scenario, and show it fails because lead-05 is missing. Revert with Edit, and show `git diff --exit-code` is clean.
6. `git log --oneline origin/dev..HEAD`: `docs(spec)`, then `chore(test)`, then the 10 commits above.

**Then stop and ask** before pushing or opening the PR (§9 step 5).

## Not touched

Only the files in SPEC §4 change. No packages, schema, CI, settings or docs.
