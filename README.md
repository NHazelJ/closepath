# ClosePath

A free front-office app for a small real estate brokerage. Homebuyers search listings and request showings, agents work a scored lead list with automated follow-up, and the broker routes leads and watches team stats. CS6983 Project 3, by Najib ([NHazelJ](https://github.com/NHazelJ)) and Parker ([pem2k](https://github.com/pem2k)).

> **HW4 graders:** start at [`docs/hw4-submission.md`](docs/hw4-submission.md). It lists every rubric item with links to its evidence.

## Status

**Sprint 1** (Nov 18 to Dec 4), tracked on the [project board](https://github.com/users/NHazelJ/projects/2).

Built so far, test-first, as pure functions:
- F1 listing search: `src/lib/domain/listing-search.ts`
- F2 lead scoring and today's call list: `src/lib/domain/lead-scoring.ts`, `call-list.ts`

Pages, the database and sign-in come next.

## Docs

| Doc | What's in it |
|---|---|
| [PRD](docs/PRD.md) | Roles, features F1 to F5, acceptance criteria, Definition of Done |
| [Architecture](docs/architecture.md) | Stack, ADRs, data model, environments |
| [Testing](docs/testing.md) | TDD loop, commit convention, test pyramid |
| [Security](docs/security.md) | OWASP Top 10:2025, security gates, Claude Code permissions |
| [Design](docs/design/README.md) | Wireframes for the dashboard, leads and listings |
| [CLAUDE.md](CLAUDE.md) | How Claude Code works in this repo |

## Getting started

Needs Node 24, plus Docker Desktop for the local database.

```bash
npm ci
docker compose up -d   # local PostgreSQL 18 (closepath_dev and closepath_test)
npm run dev            # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm test` | Vitest, run once |
| `npm run test:coverage` | Tests with the 70% coverage thresholds |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
