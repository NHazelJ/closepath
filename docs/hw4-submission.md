# HW4 submission: Claude Code Workflow & TDD

**Team:** Najib ([NHazelJ](https://github.com/NHazelJ)) and Parker ([pem2k](https://github.com/pem2k)) · **Repo:** https://github.com/NHazelJ/closepath (default branch `dev`) · **App:** ClosePath, our Project 3 ([PRD](PRD.md))

Every rubric item, with links to its evidence. To check it yourself: `npm ci && npm test` runs **119 tests, all passing**, and `npm run lint` and `npm run typecheck` are clean.

## 1. CLAUDE.md & project setup (25%)

| Requirement | Evidence |
|---|---|
| Comprehensive CLAUDE.md: tech stack, architecture decisions, coding conventions, testing strategy, do's and don'ts | [`CLAUDE.md`](../CLAUDE.md): the Stack, Architecture rules, Coding conventions, Testing strategy, Do and Don't sections. ADR-0 to ADR-12 are in [`architecture.md`](architecture.md) |
| At least one `@import` | 5 imports: `@AGENTS.md`, `@docs/PRD.md`, `@docs/architecture.md`, `@docs/testing.md`, `@docs/security.md` |
| `/init` output, then iterate on CLAUDE.md | v1 from `/init`: [`1f2663c`](https://github.com/NHazelJ/closepath/commit/1f2663c) · v2 rewrite: [`4fbbb17`](https://github.com/NHazelJ/closepath/commit/4fbbb17) · then v2.1 to v2.4, listed in its Changelog · [`01-init.txt`](session-logs/01-init.txt) · screenshots [`hw4-init-proposed.png`](screenshots/hw4-init-proposed.png), [`hw4-init-done.png`](screenshots/hw4-init-done.png) |
| Permissions (allowlists or sandboxing) | [`.claude/settings.json`](../.claude/settings.json): 117 allow, 57 ask and 68 deny rules, plus the sandbox. Explained and tested in [`security.md`, "Claude Code permissions"](security.md#claude-code-permissions) · screenshots `hw4-permissions-*.png` |
| Context management (`/clear`, `/compact`, `--continue`) | [`context-management.md`](context-management.md) · screenshots `hw4-context-*.png`. `/context` caught that our `@imports` weren't loading (fixed in v2.2: [`00662b9`](https://github.com/NHazelJ/closepath/commit/00662b9)) |

## 2. Explore → Plan → Implement → Commit (30%): F2 lead scoring ([#7](https://github.com/NHazelJ/closepath/issues/7), [PR #23](https://github.com/NHazelJ/closepath/pull/23))

We followed the course's updated HW4 page, which adds a spec step before the 4 phases.

| Phase | Evidence |
|---|---|
| **Spec:** Claude interviews us with AskUserQuestion, then writes `SPEC.md`, committed before any code | [`SPEC.md`](../SPEC.md), commit [`6e838ec`](https://github.com/NHazelJ/closepath/commit/6e838ec) · [`03-f2-spec-interview.txt`](session-logs/03-f2-spec-interview.txt) (2 rounds of 4 questions) |
| **Explore:** Glob, Grep, Read (in a fresh session, the `/clear` step) | [`04-f2-build.txt`](session-logs/04-f2-build.txt), lines 29 to 216 |
| **Plan:** Plan mode, approved before any code | [`04-f2-build-plan.md`](session-logs/04-f2-build-plan.md) · [`hw4-part2-plan-mode-1-written.png`](screenshots/hw4-part2-plan-mode-1-written.png), [`hw4-part2-plan-mode-2-approved.png`](screenshots/hw4-part2-plan-mode-2-approved.png) |
| **Implement:** execute the plan | [`lead-scoring.ts`](../src/lib/domain/lead-scoring.ts), [`call-list.ts`](../src/lib/domain/call-list.ts) · build log lines 263 to 850 · screenshots `hw4-part2-build-1` to `-5` |
| **Commit:** at least 3 clean commits | 10 commits, [`465b9cc`](https://github.com/NHazelJ/closepath/commit/465b9cc) to [`814ee40`](https://github.com/NHazelJ/closepath/commit/814ee40) ([PR #23 commits](https://github.com/NHazelJ/closepath/pull/23/commits)) |

## 3. TDD with Claude Code (30%): F1 listing search ([#4](https://github.com/NHazelJ/closepath/issues/4), [PR #5](https://github.com/NHazelJ/closepath/pull/5), Parker)

| Requirement | Evidence |
|---|---|
| Failing tests first, then the minimum code, then refactor, for every AC | F1-AC1 to F1-AC5: `test(...) (red)` → `feat(...) (green)` → `refactor(...)`, from [`0f0ba71`](https://github.com/NHazelJ/closepath/commit/0f0ba71) to [`e60eea7`](https://github.com/NHazelJ/closepath/commit/e60eea7) ([PR #5 commits](https://github.com/NHazelJ/closepath/pull/5/commits)) |
| Tests written before the implementation | Every `(red)` commit adds only tests and stubs. Tests that never failed were found and removed ([`aa6bced`](https://github.com/NHazelJ/closepath/commit/aa6bced)) |
| Session log | [`02-f1-listing-search.txt`](session-logs/02-f1-listing-search.txt) · code: [`listing-search.ts`](../src/lib/domain/listing-search.ts) |

Part 2 was also built test-first, with 4 more red commits, so `dev` has **9 red commits** across both features. Each red commit in Part 2 was checked out again and its tests really fail (6, 33, 37 and 22 failing tests).

## 4. Reflection & session log (15%)

| Requirement | Evidence |
|---|---|
| 1 to 2 page reflection: how the workflow compares to our previous approach, and which context management strategies worked best | [`hw4-reflection.md`](reflections/hw4-reflection.md): one section per partner, about 820 words |
| Annotated Claude Code session log | [`hw4-annotated-log.md`](session-logs/hw4-annotated-log.md): walks through Parts 1 to 3 with line numbers into logs [`01`](session-logs/01-init.txt) to [`04`](session-logs/04-f2-build.txt) |
