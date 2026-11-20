# HW4 Reflection

ClosePath, CS6983. Part 3 (TDD, F1 listing search) was Parker's; Part 2 (spec, then Explore, Plan, Implement, Commit, F2 lead scoring) was Najib's. The annotated session log is `docs/session-logs/hw4-annotated-log.md`.

## Parker: TDD with Claude Code (F1 listing search)

The clearest lesson from building the listing search/filter with Claude Code was that the agent wanted to write tests aggressively, and that coverage numbers hid useless tests. I saw the same pattern in my last project, where tests were monolithic and overly granular.

The workflow looked correct, Claude planned the module, wrote a red commit for each acceptance requirement, made it pass, refactored, and finished with 45 passing tests and 98.6% coverage. When I read the tests, though, several didn't test anything meaningful. When I asked Claude to check every red commit, it found six tests that passed in the same commit that added them. They had never been red, so they weren't evidence of anything.

I had Claude remove those tests. My takeaway is that the red/green/refactor loop isn't useful if nobody reads the tests. The rubric checks that red commits exist, and my history would have passed before I reviewed it. Next time I'll ask for that check during the red step instead of auditing afterwards. I'll also push back on coverage as the goal during test implementation; the initial 98% coverage included tests that couldn't fail, a monolithic hard to read setup, and tests that didn’t matter.. The same review habit also caught a design issue: Claude's first plan hardcoded the property types inside the search module. I pointed out that they belong to the data model, since a new type such as trailers or empty lots shouldn't need a code change, so the final module takes the allowed list from the calling function.

For the filter feature I implemented, context management barely mattered. Exploring, planning, implementing, cleaning up the tests and opening the PR all fit in one session without nearing the context limit, so I never needed /compact or /clear. The module was also deliberately small and self-contained. If I had continued to a related feature in the same chat, such as the /listings page or the listing detail page, I would compact first and keep only what the next feature depends on, interfaces, schemas, user flow context, etc.

Finally, I noticed that it’s a lot easier to build a slop bomb with an agentic loop setup as the agent wants to continue faster than you can review its decisions. It’s also more overwhelming during the review processes, as more code and tests are generated per run. Because of it’s capabilities, it could probably roughly one shot the application, which highlighted why each targeted issue should be narrowly scoped, so it’s actually reasonable for a human to read it.

An addendum to my last paragraph for the grader, my commit for this feature looks massive, adding ~7200 lines, and removing ~3200 lines. This was in relation to lockfiles and libraries, and is fixed for future commits/prs, the actual size of submitted code was ~550 lines including tests. The other offender here was the export of my claude conversation, taking around ~220 lines

## Najib: Spec, then Explore, Plan, Implement, Commit (F2 lead scoring)

**Explore → Plan → Implement → Commit vs. before.** Before, I described the whole feature in one long prompt and let Claude build it in one go, so I reviewed a big pile of code at the end. This time, working in order caught problems before any code existed. While exploring the configs, Claude found that ESLint warns on unused parameters, so the plan changed how the test stubs were written before the first commit. Approving the plan in Plan mode meant I reviewed one page instead of ten commits, and the result was ten small red, green and refactor commits that each did one thing.

**Did the spec change what we built?** Yes. The interview asked which events count as “contacting” a lead. F3 sends every new lead an automatic reply, and the F2 call list hides leads contacted today. If emails counted, every new website lead would vanish from the call list the moment it arrived. We decided that only agent actions count (D7). Without the spec, we would have found this in Sprint 2, while building F3. One caution: I picked the recommended option for all eight questions, so the interview only helps if I actually read the trade-offs instead of rubber-stamping them.

**Context management.** Three things worked. `/context` showed that none of our `@imports` were loading, because of a colon after each path, and we wouldn’t have noticed otherwise. Running the spec interview and the build in separate sessions forced the spec to stand on its own, and it kept each session log clean. Using one long session to coordinate, with short sessions for the real work, kept the context small where it mattered.
