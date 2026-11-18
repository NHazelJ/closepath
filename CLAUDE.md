# CLAUDE.md

Guidance for Claude Code in the **ClosePath** repo: a free, front-office app for a small real estate brokerage. Homebuyers search listings and request showings. Agents work a scored lead list with automated follow-up. The broker routes leads and watches team stats. This is CS6983 Project 3 (HW4 is done in the same repo).

## Imported context

These files load into every session. Keep them accurate.

- @AGENTS.md: this Next.js version has breaking changes. Read `node_modules/next/dist/docs/` before using any Next.js API.
- @docs/PRD.md: roles, the five features (F1 to F5), acceptance criteria (`F2-AC5` and so on), Definition of Done.
- @docs/architecture.md: stack, ADRs, data model, folder layout, environments.
- @docs/testing.md: TDD loop, commit convention, test pyramid, coverage rules.
- @docs/security.md: OWASP Top 10:2025 mapping, security gates, known advisories.

Read these when needed (not imported):

- `docs/context-management.md`: session strategy.
- `docs/rubric-checklist.md`: grading checklist.
- `docs/sprints/`, `docs/standups/`: sprint notes.

## Commands

| Command | What it does | Status |
|---|---|---|
| `npm run dev` | Dev server at http://localhost:3000 (Turbopack) | ready |
| `npm run build` | Production build | ready |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + TypeScript) | ready |
| `npm run typecheck` | `tsc --noEmit` | ready |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | Vitest | added with Vitest |
| `npm run test:e2e` | Playwright | added with Playwright |
| `npm run format` | Prettier | added with Prettier |
| `npx prisma migrate dev` / `npm run db:seed` | Database migrations and demo data | added with Prisma |

Do not run a command marked "added with ..." until it exists in `package.json`.

## Stack

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4 + shadcn/ui, PostgreSQL on Neon, Prisma 7, Better Auth, Zod, Vitest, Playwright, fast-check, Stryker. Deployed on Vercel. CI runs on GitHub Actions. **Everything must stay free:** no paid APIs or services.

**Stable releases only.** Never install beta, RC, canary, alpha or `next` versions. Check `npm view <pkg> dist-tags` first, because some `latest` tags point to pre-releases. Example: `prisma`'s `latest` tag is an 8.0 RC, so install `prisma@7` and `@prisma/client@7`.

## Architecture rules

- **Server Components by default.** Add `"use client"` only to the small interactive pieces, as low in the tree as possible.
- **All data access goes through the DAL in `src/server/`** (marked `import "server-only"`). It checks session, role and ownership. Pages, components and actions never import Prisma directly.
- **Mutations are Server Actions in `src/server/actions/`,** always in this order: validate with Zod, authorize, mutate, then update the cache (`updateTag`, `revalidateTag` or `refresh`). Return `{ ok: true, data }` or `{ ok: false, error }`; don't throw raw errors at the UI.
- **Business rules are pure functions in `src/lib/domain/`:** no Prisma, no `fetch`, no `Date.now()`. Pass `now` in. This is where TDD happens.
- **`src/proxy.ts`** (not `middleware.ts`, which was renamed in Next.js 16) only does optimistic redirects. Real authorization lives in the DAL.
- **Cache Components are on.**
  - Public listing data may use `"use cache"` + `cacheTag`.
  - User-specific data is read inside `<Suspense>` and never put in a shared cache.
  - Request APIs (`cookies()`, `headers()`, `params`, `searchParams`) are async: `await` them.
- **Email only goes through the email adapter,** which writes to the outbox and optionally sends via Resend. Never call Resend directly from features.

## Coding conventions

- **TypeScript:**
  - Strict.
  - No `any`: use `unknown` and narrow it.
  - No `!` non-null assertions outside tests.
  - Prefer `type` over `interface` unless extending.
- **Naming:**
  - Files and folders: `kebab-case`.
  - React components: `PascalCase`.
  - Hooks: `useThing`.
  - Constants: `SCREAMING_SNAKE_CASE`.
  - Zod schemas end in `Schema` (`leadFormSchema`).
- **Exports:** named exports everywhere, except the files Next.js requires to have a default export (`page.tsx`, `layout.tsx` and so on).
- **Imports:** use the `@/` alias for anything under `src/`. No deep relative paths (`../../..`).
- **Data:**
  - Prices are whole-dollar integers.
  - Timestamps are UTC `Date` objects in the database.
  - Format times for display in `America/Los_Angeles` with `Intl.DateTimeFormat`.
- **UI:**
  - Use Tailwind classes and shadcn/ui from `src/components/ui`; no inline styles.
  - Every page has loading, empty and error states.
  - Forms have labels and inline errors.
  - Images have `alt` text.
- **Formatting:** formatting and lint must pass with zero warnings (Prettier and ESLint).

## Testing strategy (summary of docs/testing.md)

- **TDD for domain logic and every acceptance criterion:**
  - **Red:** commit the failing test (`test(scope): F2-AC5 ... (red)`).
  - **Green:** commit the minimal code (`feat(scope): F2-AC5 ... (green)`).
  - **Refactor:** commit the cleanup (`refactor(scope): ...`).
- **Test names start with the AC ID.** Unit tests sit next to the code (`*.test.ts`). Integration tests use a real database (`*.int.test.ts`). E2E tests live in `e2e/*.spec.ts`.
- **Don't game the tests:**
  - Never change or delete a test to make it pass.
  - Never skip tests.
  - Never lower the 70% coverage thresholds.
- **Done means verified:** a task is not done until `lint`, `typecheck` and the relevant tests pass. Run them and report the result.

## Git and PR workflow

- **Branches:**
  - One per GitHub issue: `feat/<issue#>-short-name`, `fix/...`, `test/...`, `docs/...`, `chore/...`.
  - `dev` is the integration branch. `main` is production and only receives `dev` at sprint end.
  - Both `dev` and `main` are protected: changes go through a PR, with no force-pushes.
- **Commits:**
  - Use Conventional Commits.
  - Keep them small and focused.
  - When Claude wrote the change, add a `Co-Authored-By: Claude ...` trailer.
- **PRs:**
  - Target `dev`.
  - Merge with a **merge commit only** (squash is disabled so red, green and refactor commits stay in history).
  - Every PR description includes **AI disclosure**: % AI-generated, tool used, and what the human reviewed.
  - Selected PRs get a C.L.E.A.R. review from the partner.
- **Commit email:** commit with the GitHub `noreply` email; never a personal address.

## Security (OWASP Top 10:2025, details in docs/security.md)

1. **A01 Broken Access Control:** check role + ownership in the DAL on every read and write.
2. **A02 Security Misconfiguration:** set security headers; no stack traces in production; secrets only in env vars.
3. **A03 Software Supply Chain Failures:** use `npm ci`, keep the lockfile, run `npm audit`, and justify every new dependency.
4. **A04 Cryptographic Failures:** HTTPS; leave password hashing to Better Auth; httpOnly/Secure cookies; sign unsubscribe tokens.
5. **A05 Injection:** use Prisma queries and Zod validation; no `$queryRawUnsafe` and no `dangerouslySetInnerHTML`.
6. **A06 Insecure Design:** abuse cases are acceptance criteria (duplicates, forged slots, double-booking, double sends).
7. **A07 Authentication Failures:** Better Auth sessions with rate-limited sign-in; demo accounts are test-only.
8. **A08 Software or Data Integrity Failures:** protected branches, CI must pass, `CRON_SECRET` on cron routes, transactions for bookings.
9. **A09 Security Logging and Alerting Failures:** log auth failures and denials; lead timeline as an audit trail.
10. **A10 Mishandling of Exceptional Conditions:** error boundaries, typed action results, and fail closed.

## Do

- Read the PRD acceptance criteria for the feature before planning or coding. Cite AC IDs in tests, commits and PRs.
- For any non-trivial feature, use **Explore, then Plan, then Implement, then Commit**:
  - explore with Glob/Grep/Read;
  - plan in Plan mode;
  - implement;
  - commit in small steps.
- Check `node_modules/next/dist/docs/` before writing Next.js code. Follow deprecation notices.
- Keep business rules pure and in `src/lib/domain/`, with tests written first.
- Use generated, fictional data only (faker with a fixed seed, `prisma/seed/listings.json`).
- Update this file and `docs/` in the same PR when a convention or decision changes.
- Ask before adding a dependency, changing the database schema, or touching CI and deploy config.

## Don't

- Don't read, print, or commit `.env*` files, tokens or keys. Use `.env.example` for placeholders.
- Don't add paid services or API calls, including in-app AI or Anthropic API calls in app code. The project must cost $0.
- Don't install beta, RC, canary or alpha packages. Use the newest stable release (see Stack).
- Don't create `middleware.ts`, and don't rely on `proxy.ts` for authorization.
- Don't query Prisma outside `src/server/`, and don't pass full database records to client components; select only needed fields.
- Don't use `any`, `@ts-ignore`, `eslint-disable`, `$queryRawUnsafe` or `dangerouslySetInnerHTML` to make something work.
- Don't push to `main` or `dev` directly, force-push, squash-merge, or rewrite pushed history.
- Don't skip or weaken tests, or mark work done without running the checks.
- Don't put real people's names, emails or phone numbers in code, seeds, tests, logs or screenshots.

## Context management

- **One session per task:** feature, bug or doc. Start it with a clear goal. Use `/clear` when switching tasks.
- **When the context gets long** (check `/context`), use `/compact` with a focus, for example `/compact keep the F5 plan and open TODOs`.
- **To resume:** `claude --continue` picks up the last session; `claude --resume` picks a specific one.
- **Save each session that is HW4/P3 evidence** with `/export` into `docs/session-logs/NN-topic.txt`, with personal emails removed.
- **Use sub-agents for wide searches or reviews** so the main context stays small.
- Details: `docs/context-management.md`.

## Changelog

- **v1** (Nov 18): generated by `/init`. Commands, stack and the scaffold's file layout only.
- **v2** (Nov 18): rewritten for ClosePath.
  - Added `@imports` (AGENTS.md, PRD, architecture, testing, security).
  - Added architecture rules, conventions, the TDD strategy, git workflow, the OWASP Top 10:2025 summary, do's and don'ts, and context management.
  - Added the team rule: stable package releases only (no beta or RC).
  - Removed the starter-template details that /init documented (fonts, default page), since they will be replaced.
