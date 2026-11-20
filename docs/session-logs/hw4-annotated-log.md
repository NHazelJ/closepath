# HW4 annotated session log

This page walks through the HW4 workflow and points to the moments that show each step in the raw Claude Code logs. Line numbers refer to the files in this folder.

**How to read the logs:** `❯` is a message to Claude, `⏺` is Claude's reply or a tool call, and `⎿` is the tool's output. Thinking blocks are left out, long output is cut short, and personal emails are removed.

| File | What it is |
|---|---|
| `01-init.txt` | Part 1: `/init` and the first CLAUDE.md |
| `02-f1-listing-search.txt` | Part 3: Parker's TDD session for F1 listing search (issue #4, PR #5) |
| `03-f2-spec-interview.txt` | Part 2, Spec: Claude interviews Najib and writes `SPEC.md` (issue #7) |
| `04-f2-build.txt` | Part 2, after `/clear`: Explore, Plan, Implement, Commit from `SPEC.md` alone |
| `04-f2-build-plan.md` | Part 2: the plan Claude proposed in Plan mode, copied unchanged |

Screenshots: `docs/screenshots/hw4-*.png`.

## Part 1: Project setup

- **`/init` gave us v1 of CLAUDE.md** (`01-init.txt`, screenshots `hw4-init-*.png`). It only listed the commands and the scaffold's layout, so we rewrote it as v2 with the stack, ADRs, conventions, the TDD strategy, OWASP and the do's and don'ts.
- **`/context` caught a silent bug.** In v2, every `@import` had a colon right after the path (`@docs/PRD.md:`), so none of the 5 files loaded. `/context` listed only `CLAUDE.md` under memory files (`hw4-context-usage.png`). After the fix, all 5 appear (`hw4-context-usage-after-fix.png`). The fix is recorded as CLAUDE.md v2.2.
- **Permissions:** `.claude/settings.json` has allow, ask and deny lists and the sandbox setting. We tested the deny rules on purpose: `--no-verify` and `git push --force` were blocked (`hw4-permissions-*.png`, `docs/security.md`).

## Part 2: Spec → Explore → Plan → Implement → Commit (F2 lead scoring, issue #7)

### Spec: the interview (`03-f2-spec-interview.txt`)

- **Line 31:** before asking anything, Claude read the issue, the F2 section of the PRD and Parker's domain module, so its questions only covered what the PRD leaves open.
- **Line 127, round 1 (4 questions):**
  - how to measure the 1, 7 and 30 day windows and "today";
  - which showing requests earn +25;
  - the input shape of `scoreLead`;
  - whether to store the score.

  Each question puts its recommended option first, and each option explains its trade-off.
- **Line 144, round 2, the question that changed the design:** *which events set `lastContactedAt`?* Claude linked two features we had only thought about separately:
  - F3 sends every new lead an automatic reply right away.
  - F2's call list hides leads contacted today.

  If emails counted as contact, every new website lead would vanish from the call list the moment it arrived, and E2E flow 1 in `docs/testing.md` would fail. We chose "agent actions only" (decision D7 in `SPEC.md`). Without the interview, we would only have found this in Sprint 2, while building F3.
- **Line 170:** before committing, Claude ran the spec's example timestamps through `Intl.DateTimeFormat` to check the Los Angeles dates and weekdays it had written.
- **Line 185:** `SPEC.md` committed by itself, with no code. After Parker's PR #5 merged, the spec commit was replayed on top of the new `dev` (`4391f5c` became `6e838ec`, same content), so it is still the first commit on the branch.

### `/clear`, then build from the spec alone (`04-f2-build.txt`)

This ran in a new session with no memory of the interview. Its only inputs were `SPEC.md` and the repo.

- **Explore (lines 29 to 216):**
  - Read `SPEC.md`, Parker's `listing-search.ts` and its test (the pattern to copy), the Vitest, TypeScript and ESLint configs.
  - Grep'd inside `node_modules` for the exact fast-check and Vitest APIs.
  - **One finding changed the plan (line 197):** ESLint warns on unused parameters. So a plain throwing stub would make every red commit noisy. The plan has each stub throw `new Error("not implemented", { cause: { lead, now } })`, so a red test can only fail at runtime, on the stub.
- **Plan (line 246):**
  - Plan mode, then approved before any code: `04-f2-build-plan.md`, `hw4-part2-plan-mode-1-written.png`, `hw4-part2-plan-mode-2-approved.png`.
  - The plan lists one row per commit, and a check to run before each red and each green commit.
- **Implement and Commit (lines 263 to 680), 10 commits:**
  - **Line 301:** red #1. The 6 F2-AC6 tests fail with `not implemented`, while typecheck and lint stay clean. That proves the failure isn't an import or type error.
  - **Lines 314 to 480:** green, then red for F2-AC5 (33 failing tests), then red for the F2-AC8 property tests (37 failing). The property tests are committed **before** `scoreLead` exists, so their red step is real. Then green.
  - **Line 491:** refactor. The rules move into `recencyPoints` and `cappedPoints`, and all 62 tests still pass.
  - **Line 556:** red for the F2-AC7 call list (22 failing), then green and refactor.
  - **Before every green or refactor commit,** `git diff --cached --stat` shows that no test file changed.
- **Verify (lines 680 to 850):**
  - lint, typecheck, then 119/119 tests. Coverage is 100% on both new files.
  - **Line 780:** to prove the end-to-end scenario test can fail, Claude switched `isContactedToday` to UTC dates. The scenario failed, because lead-05 went missing. That lead was called at 11:30pm yesterday in LA, which is already today's date in UTC, so the UTC version wrongly treats it as contacted today. Then Claude reverted the change.

## Part 3: TDD (F1 listing search, Parker: `02-f1-listing-search.txt`, PR #5)

- Red, green, then refactor for each of F1-AC1 to F1-AC5. The commits are `test(...) (red)` → `feat(...) (green)` → `refactor(...)`.
- **Parker read the tests instead of trusting coverage.** Claude reached 98.6% coverage, but when Parker asked it to check every red commit, it found six tests that had passed in the same commit that added them. He removed them (`aa6bced`) and re-added one with proof that it can fail (`4084609`). His reflection covers this.
- We used that lesson in Part 2: each red commit there was checked out again, and its tests really fail (6, 33, 37 and 22 failures).

## The commit trail on `dev`

| Order | Commit | Step |
|---|---|---|
| 1 | `7c5ef84` … `e60eea7` (PR #5) | Part 3: F1 red, green, refactor (Parker) |
| 2 | `6e838ec docs(spec): F2-AC5 to F2-AC8 ...` | Part 2: spec, before any F2 code |
| 3 | `79aa6ff chore(test): add fast-check` | setup the spec asks for |
| 4 | `465b9cc` … `814ee40` (10 commits) | Part 2: implement and commit, test-first |
| 5 | `603f06d`, `ee5b507` | Part 2 evidence: plan file and screenshots |
