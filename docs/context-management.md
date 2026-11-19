# Context Management Strategy

Claude Code's context window holds the conversation, every file it reads, and `CLAUDE.md` with its imports. As the window fills, older details get summarized away and answers get less precise. This is how we keep each session focused.

## What every session starts with

- **`CLAUDE.md` plus 5 imports:** `AGENTS.md`, `docs/PRD.md`, `docs/architecture.md`, `docs/testing.md` and `docs/security.md`. They load into every session, so we keep them short and accurate. To check, run `/context`: under memory files it should list `CLAUDE.md` and the imported files. (An early version had a colon right after each path, `@AGENTS.md:`, which made all 5 imports silently fail. `/context` is how we caught it.)
- **Read-when-needed files:** this file, the sprint notes, the standups and the rubric checklist are referenced by path in `CLAUDE.md`, not imported, so they don't use space until Claude opens them.
- **`.claude/settings.json`:** the shared permission rules (see [security.md](security.md#claude-code-permissions)). These are rules, not conversation, so they use no context.
- **Auto-memory:** Claude Code keeps short personal notes per project in `~/.claude/projects/<project>/memory/`, such as "stable releases only". That folder is personal and not committed, so team rules always go in `CLAUDE.md` instead.

## Commands and when we use them

| Command | When we use it | Example |
|---|---|---|
| `/context` | Before a big step, to see how full the window is and what fills it | Before planning a feature |
| `/clear` | When switching to an unrelated task. The conversation empties and `CLAUDE.md` loads again | After the F1 PR merges, before starting F2 |
| `/compact <focus>` | Same task, but the session is long. Claude replaces the history with a summary that keeps what the focus names | `/compact keep the F5 plan, which ACs are green, and the next failing test` |
| `claude --continue` | To reopen the most recent session in this folder (the next day, or after a restart) | Pick up a TDD loop after a break |
| `claude --resume` | To pick a specific older session from a list | Go back to the F1 planning session |
| `/rename` | To name a session after its issue, so the `--resume` list is easy to scan | `/rename F2 lead scoring #12` |
| `/export` | To save a session as evidence | `docs/session-logs/NN-topic.txt` |
| Sub-agents | For work that reads many files. Only the sub-agent's summary comes back to the main session | A security review of a PR, or "find every DAL function without a role check" |
| Plan mode | To agree on a plan before code. The approved plan is a compact summary the rest of the session works from | Explore, then Plan, then Implement, then Commit |

## Our rules

1. **One session per task:** one GitHub issue, one branch, one session. Run `/clear` (or start a new session) when the task changes, so details from the last task can't leak into the next one.
2. **Start with a clear goal:** the issue number, the AC IDs and what "done" means. For example: "Implement F2-AC5 to F2-AC8 with TDD. Done means the tests, lint and type check pass."
3. **Compact early, with a focus:** when `/context` shows the session past about half the window, or Claude starts forgetting earlier decisions, run `/compact` with a focus. Don't wait for auto-compact, which summarizes without knowing what matters most.
4. **Save decisions before clearing:** context is temporary and the repo is permanent. Before `/clear` or `/compact`, decisions should already be in a commit, the PR description, `CLAUDE.md` or `docs/`.
5. **Use sub-agents for wide searches and reviews,** so file dumps stay out of the main session.
6. **Parallel work gets separate sessions:** each git worktree (Project 3 parallel development) runs its own Claude session with its own context.
7. **Export evidence sessions** with `/export` into `docs/session-logs/`, and remove personal email addresses first.

## Example: one feature from start to finish

1. `git switch -c feat/12-lead-scoring`, start `claude`, run `/rename F2 lead scoring #12`.
2. "Read F2-AC5 to F2-AC8 in the PRD and the scoring rules." Then use Plan mode for the test list.
3. Red, green, refactor commits, one AC at a time.
4. Halfway through, `/context` shows the window filling up: `/compact keep the AC list, which ACs are green, and the next failing test`.
5. End of the day: `/exit`. The next morning: `claude --continue`, and the session picks up where it stopped.
6. PR opened and merged: `/export docs/session-logs/03-f2-tdd.txt`, then `/clear` before the next issue.

## Evidence (HW4 Part 1)

| What | Screenshot |
|---|---|
| `/init` creating the first `CLAUDE.md` | [proposed](screenshots/hw4-init-proposed.png), [done](screenshots/hw4-init-done.png) |
| `/export` saving the `/init` session (now [`session-logs/01-init.txt`](session-logs/01-init.txt)) | [export](screenshots/hw4-context-export.png) |
| `/context` showing what fills the window. Before the import fix, memory files listed only `CLAUDE.md` (4.4k tokens); after it, all 6 files (18.7k tokens) | [before](screenshots/hw4-context-usage.png), [after](screenshots/hw4-context-usage-after-fix.png) |
| `/compact` with a focus | [compact](screenshots/hw4-context-compact.png) |
| `claude --continue` reopening the last session | [continue](screenshots/hw4-context-continue.png) |
| `/clear` before a new task | [clear](screenshots/hw4-context-clear.png) |

Email addresses are blacked out in every screenshot.
