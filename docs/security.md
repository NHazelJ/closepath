# Security

ClosePath stores personal data (names, emails and phone numbers of leads and homebuyers) and has three permission levels. The main risks:

- an agent reading another agent's leads;
- a buyer touching agent or broker features;
- secrets leaking from the public repo.

## OWASP Top 10:2025, applied to ClosePath

| # | Risk | How ClosePath handles it |
|---|---|---|
| A01 | Broken Access Control | Every read and write goes through the DAL (`src/server/`). It checks the session, the role and ownership (an agent's own leads only). IDs from the client are never trusted. Integration tests cover "wrong role" and "someone else's lead" for each feature. `proxy.ts` is never the only check. |
| A02 | Security Misconfiguration | Secrets live only in Vercel and GitHub env vars, and `.env*` is git-ignored. Security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`) are set in `next.config.ts`. No debug output or stack traces in production. Claude Code is denied access to `.env` files (see [Claude Code permissions](#claude-code-permissions)). |
| A03 | Software Supply Chain Failures | `package-lock.json` is committed and CI uses `npm ci`. `npm audit` runs in CI and Dependabot alerts are on. GitHub Actions are pinned to versions. New dependencies need a reason in the PR. |
| A04 | Cryptographic Failures | HTTPS everywhere (Vercel). Better Auth hashes passwords (scrypt). Session cookies are `httpOnly`, `Secure` and `SameSite=Lax`. Secrets are random and at least 32 bytes. Unsubscribe links use signed tokens. |
| A05 | Injection | Prisma parameterizes every query. `$queryRawUnsafe` is banned. Zod validates all input on the server. React escapes output. `dangerouslySetInnerHTML` is banned. Email templates escape the values they fill in. |
| A06 | Insecure Design | Abuse cases are written into the acceptance criteria: duplicate leads (F1-AC9), forged showing slots (F5-AC2), double-booking (F5-AC5), double email sends (F3-AC5). The lead form and sign-in are rate-limited. |
| A07 | Authentication Failures | Better Auth handles sign-up, sign-in and sessions, with minimum password length and built-in sign-in rate limiting. Sessions expire. Demo accounts are test-only and listed in the README. |
| A08 | Software or Data Integrity Failures | `main` and `dev` only change through pull requests, which must pass CI, with no force-pushes. The cron route requires `CRON_SECRET`. Booking a showing runs in a database transaction. |
| A09 | Security Logging and Alerting Failures | Failed sign-ins and authorization denials are logged on the server (Vercel logs). Lead changes are recorded in the lead timeline (who did what, when). |
| A10 | Mishandling of Exceptional Conditions | `error.tsx` and `not-found.tsx` boundaries. Actions return typed `{ ok: false, error }` results instead of throwing raw errors. Auth checks fail closed (an error means "deny"). Bookings are atomic. |

## Security gates in the pipeline

Project 3 needs at least 4. We plan 6:

| # | Gate | Where | Blocks merge? |
|---|---|---|---|
| 1 | **Secrets detection:** Gitleaks | Pre-commit hook and CI | Yes |
| 2 | **Dependency scanning:** `npm audit --omit=dev --audit-level=high` | CI | Yes |
| 3 | **SAST:** GitHub CodeQL (free for public repos) | CI | Yes, for high-severity findings |
| 4 | **Security reviewer:** sub-agent in `.claude/agents/` | Run on PRs that touch auth, the DAL or Server Actions | Findings must be addressed |
| 5 | **Security acceptance criteria in the Definition of Done** | [PRD section 6](PRD.md#6-definition-of-done) and the PR template | Review checklist |
| 6 | **OWASP Top 10 awareness** | This file, summarized in `CLAUDE.md` | Guides every change |

A full `npm audit`, including dev dependencies, also runs in CI as a report-only step, so nothing is hidden.

## Claude Code permissions

`.claude/settings.json` is committed and shared by the team. It sets what Claude Code may do in this repo.

| List | What's in it | Effect |
|---|---|---|
| **allow** | Checks and tests (`npm run lint`, `typecheck`, `build`, `test*`), read-only git and `gh` commands, local `git add` and `git commit`, edits in `src/`, `e2e/`, `docs/` and the seed files, and fetching from a short list of docs sites | Runs without a prompt |
| **ask** | Installing or removing packages, Prisma migrations and `db` commands, `git push`, merge, rebase, hard reset and amend, creating, commenting on or merging PRs, `gh api`, Vercel, `Remove-Item`, and edits to `package.json`, the Prisma schema and migrations, `.github/`, `.claude/settings.json`, `.mcp.json`, `next.config.ts` and `vercel.json` | Always prompts, even when an allow rule also matches |
| **deny** | Reading or editing `.env` files (`.env.example` stays readable), `*.pem` files, and secrets in the home folder (`~/.ssh`, `~/.aws`, the gh and npm tokens, Claude's own credentials). Also `rm -rf`, `Remove-Item -Recurse`, force-pushes, pushes to `main` or `dev`, `--no-verify`, `git filter-branch`, `npm publish`, and installing beta, RC, canary, alpha or `@next` versions (ADR-0) | Blocked |

- **Order:** deny wins over ask, and ask wins over allow.
- **Both shells:** every shell rule is listed for Bash and for PowerShell, because Claude Code on Windows can use either.
- **Limits:** the `.env` deny rules also cover `cat`, `head` and similar shell commands, but not a script that opens the file itself. A PreToolUse hook (Project 3 hooks item) will close that gap.
- **Sandbox:** `sandbox.enabled` is on. On macOS, Linux and WSL2, every command not in `excludedCommands` runs in an OS sandbox. It can only write inside the project, can't read the denied files, and must ask before reaching a new network host. npm, npx, git remote commands, `gh` and Vercel are excluded, because they need the network, the npm cache or the database. Native Windows has no sandbox yet: Claude Code prints "Sandbox disabled" at startup, and the permission rules are the guard.
- **Personal overrides** go in `.claude/settings.local.json`, which is git-ignored. Don't loosen the shared file to get past a prompt.
- **Tested (Nov 18):** in a headless `claude -p` run in this repo, `git status` ran, and `git commit --no-verify` and `git push --force` were blocked. The commit is allowed by `git commit *`, so the block shows the deny rule wins.

## Known advisories

| Advisory | Package | Status |
|---|---|---|
| GHSA-fc5q-39xc-vjpf (ReDoS, high) | `picomatch` <= 4.0.7, pulled in by `eslint-config-next` | **Dev-only.** It runs inside lint tooling and is never shipped to users. No patched version existed as of 2026-11-18. The production audit (`npm audit --omit=dev`) reports 0 vulnerabilities. Re-check when Dependabot reports a fix. |

## Secrets and personal data

- **Never commit secrets.** Real values live in `.env.local` (git-ignored), Vercel environment variables, and GitHub Actions secrets. `.env.example` has placeholders only.
- **CI secrets:** `CLAUDE_CODE_OAUTH_TOKEN` (AI PR review), plus the Vercel and database values the workflows need.
- **All demo data is fictional,** generated by faker. Never put real people's details in seeds, tests or screenshots.
- **Screenshots and session logs** committed to `docs/` must not show personal email addresses or tokens.
