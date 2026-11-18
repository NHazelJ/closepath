# Testing Strategy

## Principles

1. **Test-first (TDD) for every piece of domain logic.** Red, then green, then refactor, one acceptance criterion at a time.
2. **Tests describe behavior from the PRD.** Every test name starts with the AC ID it covers, for example `F2-AC5 gives +25 for a non-cancelled showing request`.
3. **Test behavior, not implementation.** Assert on outputs and visible UI, not on private functions or internal calls.
4. **Edge cases are part of the work:** boundaries (exactly 7 days, exactly 9:00), empty lists, invalid input, and wrong role.
5. **Deterministic tests.** Never read the real clock in domain code; pass `now`. Use fixed dates, a fixed time zone (`America/Los_Angeles`) and a fixed faker seed.

## Test pyramid

| Level | Tool | What it covers | File pattern | Runs |
|---|---|---|---|---|
| Unit | Vitest | Pure domain rules in `src/lib/domain`, Zod schemas, small utils | `*.test.ts` next to the source | Every commit and PR |
| Component | Vitest + Testing Library | Client components: forms, filters, error and empty states | `*.test.tsx` next to the component | Every PR |
| Integration | Vitest + real Postgres | DAL functions and Server Actions: auth and role checks, Prisma queries, transactions (double-booking) | `*.int.test.ts` | Every PR (CI uses a Postgres service container) |
| End-to-end | Playwright | Whole user flows in a real browser against `next build` + `next start` | `e2e/*.spec.ts` | Every PR |
| Property-based | fast-check (inside Vitest) | Invariants that must hold for any input | `*.property.test.ts` | Every PR |
| Mutation | Stryker | How well the unit tests catch bugs in `src/lib/domain` | `stryker.config.mjs` | Manually, and once per sprint |

## The TDD loop and commit convention

For each acceptance criterion:

| Step | What you do | Commit message |
|---|---|---|
| **Red** | Write the smallest test for the next AC. Run it and watch it fail for the right reason. Commit the failing test. | `test(scoring): F2-AC5 add failing test for showing bonus (red)` |
| **Green** | Write the minimum code that makes it pass. Do not touch the test. | `feat(scoring): F2-AC5 add showing bonus (green)` |
| **Refactor** | Clean up names and duplication. All tests stay green. | `refactor(scoring): extract recency points helper` |

Rules:

- **The red commit must contain a failing test.** That is the evidence graders look for in the git history.
- **Never edit or delete a test to make it pass** during the green step. If the test was wrong, fix it in its own commit and say why.
- **Never skip tests or lower coverage thresholds** to get green.
- **Hooks and CI allow red commits.** The pre-commit hook only runs secret scanning, formatting and lint, not tests. CI runs on the PR as a whole, which must be green before merging.
- **PRs keep every commit.** Merge commits only, never squash, so the red, green and refactor commits stay visible.

## Coverage

- **Tool:** `@vitest/coverage-v8`.
- **Thresholds:** 70% for lines, branches, functions and statements, set in `vitest.config.ts`. CI fails below them.
- **Target:** domain logic in `src/lib/domain` aims for 90% or more.
- **Excluded:** generated code (Prisma client), `src/components/ui` (shadcn primitives), config files, and type-only files.

## Integration test database

- **CI:** GitHub Actions starts a `postgres` service container. The workflow runs `prisma migrate deploy`, then the tests.
- **Locally:** a separate Neon branch named `test`, via `DATABASE_URL` in `.env.test`. Never point tests at the production branch.
- **Isolation:** each test file resets the tables it uses (truncate) and seeds only the rows it needs.

## End-to-end flows (Playwright)

At least one is required for Project 3. We plan three:

1. **Lead capture (F1 to F2):** a visitor searches, opens a listing and sends "Request info". The assigned agent signs in and sees the new lead at the top of the call list.
2. **Showing (F5):** a homebuyer requests a slot, the agent confirms it, and the buyer sees "Confirmed". The same slot is no longer offered to another buyer.
3. **Routing (F4):** the broker adds a city rule, a new lead for that city goes to the rule's agent, and an agent cannot open `/broker`.

## Property-based tests (fast-check)

| Property | AC |
|---|---|
| Lead score is always an integer from 0 to 100, and the same input always gives the same output | F2-AC8 |
| Adding a saved home or an inquiry never lowers the score | F2-AC5 |
| Overlap is symmetric: `overlaps(a, b) === overlaps(b, a)`. Back-to-back slots never overlap. | F5-AC7 |
| Offered slots never overlap a confirmed showing and are always inside business hours | F5-AC2 |
| Round-robin: after any number of leads, active agents' counts differ by at most 1 | F4-AC4 |

## Mutation testing (Stryker)

- **Scope:** `src/lib/domain/**`.
- **Goal:** a mutation score of 70% or higher. The report is saved under `reports/mutation/`, and the score is noted in the sprint retrospective.
- **Surviving mutants:** each one becomes a new test, or is explained.

## Commands

These scripts are added to `package.json` as each tool is installed:

| Command | Purpose |
|---|---|
| `npm test` | All Vitest tests, run once |
| `npm run test:watch` | Vitest in watch mode while doing TDD |
| `npm run test:coverage` | Tests with the coverage report and thresholds |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:mutation` | Stryker mutation testing |
