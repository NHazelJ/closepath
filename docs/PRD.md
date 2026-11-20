# ClosePath: Product Requirements (PRD)

| | |
|---|---|
| **Product** | ClosePath, a free front-office app for a small real estate brokerage |
| **Team** | Najib (NHazelJ) and Parker (pem2k), CS6983 Project 3 |
| **Status** | v1, written during HW4 Part 1 (Nov 18, 2026) |
| **Final deadline** | Dec 16, 2026, 2:59am |

## 1. Problem

Small brokerages lose deals in the gap between "someone clicked on a home" and "an agent called them back":

- Website inquiries sit in an inbox, and nobody knows which lead to call first.
- Follow-up emails depend on each agent remembering to send them.
- Booking a showing takes a chain of texts, and agents get double-booked.
- The broker cannot see which agent has which lead, or how fast leads get a response.

All-in-one platforms such as BoldTrail solve this, but they cost hundreds of dollars per agent per month. **ClosePath** covers that same front-office loop for $0: a listing site that captures leads, a CRM that tells agents who to call, automated follow-up, showing scheduling, and a broker view that routes leads and shows team stats.

## 2. Users and roles

| Role | Who | What they can do |
|---|---|---|
| **Visitor** | Anyone, not signed in | Search and view listings, send a "Request info" form |
| **Homebuyer** | Visitor with an account | Everything a visitor can, plus save homes and request, view and cancel showings |
| **Agent** | Brokerage agent (created by the broker or the seed script) | Work their own leads: timeline, notes, status, call list, follow-up plans, confirm or decline showings |
| **Broker** | Brokerage owner or admin | See all leads and agents, the team dashboard, routing rules, reassign leads |

There is one brokerage (single tenant). Its time zone is `America/Los_Angeles`.

## 3. Scope

**In scope:** the five features in section 4, sign-in with roles, generated demo data, and deployment on Vercel.

**Out of scope (non-goals):**

- **MLS/IDX feeds.** Listings are generated demo data; the professor approved this.
- **AI features inside the app.** They need a paid API; the project must cost $0. Claude is used for development and PR review only.
- **Payments**, transaction management and other back-office tools.
- **SMS or phone dialing.** Agents log calls by hand.
- **Multiple brokerages.**

## 4. Features and acceptance criteria

Each acceptance criterion (AC) has an ID such as `F2-AC5`. Use these IDs in GitHub issues, test names, commit messages and PRs, so each test traces back to a requirement.

### F1. Listing search, saved homes and lead capture (Visitor, Homebuyer)

> As a homebuyer, I want to search homes, save the ones I like, and ask about a home, so I can find a place that fits my budget and talk to an agent.

- **F1-AC1:** `/listings` shows active listings with photo, price, beds, baths, square feet and city, 20 per page, with pagination.
- **F1-AC2:** Filters for city, min price, max price, min beds, min baths and property type can be combined. Results match every filter. Filters live in the URL, so a search can be shared or bookmarked.
- **F1-AC3:** Results can be sorted by newest, price low to high, or price high to low.
- **F1-AC4:** When nothing matches, the page says so and offers a "Clear filters" action.
- **F1-AC5:** Invalid filter values (negative numbers, text in number fields, min price above max price) never crash the page. They are ignored, and a short message explains why.
- **F1-AC6:** A listing page (`/listings/[id]`) shows all listing fields, the photos, the listing agent, a "Request info" form and a "Request a showing" button.
- **F1-AC7:** A signed-in homebuyer can save and unsave a listing, and `/saved` lists their saved homes. A visitor who clicks "Save" is sent to sign in and returned to the listing afterward.
- **F1-AC8:** "Request info" (name, email, optional phone, message) creates a lead linked to the listing, with source `website`. Invalid fields show inline errors; success shows a confirmation.
- **F1-AC9:** A second request from the same email within 24 hours adds an activity to the existing lead instead of creating a duplicate.
- **F1-AC10 (security):** All form input is validated on the server. Messages are shown as plain text, so HTML or scripts in them never run.

### F2. Lead CRM, activity timeline and lead scoring (Agent)

> As an agent, I want my leads in one place, ranked by how likely they are to buy, so I call the right people first.

- **F2-AC1 (security):** An agent sees and changes only leads assigned to them. The broker sees all leads. Any other access returns "not found" or "forbidden", even if the lead ID is guessed.
- **F2-AC2:** `/agent/leads` lists leads with name, status, score, score band and last activity. It can filter by status and search by name or email.
- **F2-AC3:** The lead page shows a timeline, newest first: inquiries, saved homes, notes, logged calls, emails sent, showing events, status changes and reassignments.
- **F2-AC4:** The agent can add a note, log a call, and change status (`New`, `Contacted`, `Showing`, `Under Contract`, `Closed`, `Lost`). Each action adds a timeline entry with time and author.
- **F2-AC5:** Each lead has a score from 0 to 100, computed by these rules:

  | Signal | Points |
  |---|---|
  | Most recent buyer activity (inquiry, saved home, showing request) is 1 day old or less / 7 days or less / 30 days or less / older | 30 / 20 / 10 / 0 |
  | Has requested a showing that was not cancelled | +25 |
  | Saved homes | +5 each, up to +15 |
  | "Request info" submissions | +10 each, up to +20 |
  | Gave a phone number | +10 |
  | Status is `Closed` or `Lost` | Score is 0 |

- **F2-AC6:** Score bands are **Hot** (70 to 100), **Warm** (40 to 69) and **Cold** (0 to 39).
- **F2-AC7:** "Today's call list" shows up to 10 open leads (`New`, `Contacted` or `Showing`) that have not been contacted today. They are ordered by score, highest first; ties go to the lead contacted longest ago, and never-contacted leads come first.
- **F2-AC8:** Scoring is deterministic: the same lead at the same time always gets the same score, and the score is always between 0 and 100.

> HW4 Part 2 builds F2-AC5 through F2-AC8: a spec interview first (`SPEC.md`), then Explore, Plan, Implement, Commit, test-first. HW4 Part 3 (strict TDD) is F1-AC1 through F1-AC5.

### F3. Automated follow-up emails (Agent)

> As an agent, I want follow-up emails to go out on their own, so no lead goes cold because I forgot.

- **F3-AC1:** A new lead immediately gets an auto-reply email, which is logged in its timeline.
- **F3-AC2:** An agent can enroll a lead in a follow-up plan, a list of steps that each have a day offset, a subject and a body. Example: "New buyer", with emails on days 0, 2 and 7. The seed data includes two plans.
- **F3-AC3:** Templates support `{{firstName}}`, `{{agentName}}` and `{{listingAddress}}`. Saving a template with an unknown placeholder is rejected with an error.
- **F3-AC4:** A scheduled job sends every step that is due, and the broker has a "Send due emails now" button for demos. Each sent email appears in the lead's timeline and in the outbox.
- **F3-AC5:** The same step is never sent twice to the same lead, even if the job runs twice.
- **F3-AC6:** Emails stop when the lead's status becomes `Under Contract`, `Closed` or `Lost`, when the agent unenrolls the lead, or when the lead uses the unsubscribe link in any email.
- **F3-AC7:** With no email provider set up, emails go to an in-app outbox (`/agent/outbox`). With a `RESEND_API_KEY`, they are also sent through Resend's free tier.

### F4. Broker dashboard and lead routing (Broker)

> As a broker, I want new leads sent to the right agent automatically and a view of how my team is doing, so leads get a fast response.

- **F4-AC1 (security):** Only the broker can open `/broker` pages or change routing. Everyone else gets "forbidden".
- **F4-AC2:** The dashboard shows new leads this week, leads by status, median time to first contact, and a row per agent: active leads, % contacted, showings this week and closed deals.
- **F4-AC3:** The broker manages routing rules in priority order. A rule matches on city and/or price range and assigns to a named agent. A new lead goes to the first matching rule.
- **F4-AC4:** If no rule matches, the lead goes round-robin to the active agent who least recently received a lead. Over many leads, active agents' counts never differ by more than 1.
- **F4-AC5:** Inactive agents never receive new leads, even if a rule names them; the lead falls through to the next rule.
- **F4-AC6:** The broker can reassign a lead manually. The reassignment shows in the timeline, and the new agent is notified.

### F5. Showing scheduler (Homebuyer, Agent)

> As a homebuyer, I want to book a time to see a home without texting back and forth. As an agent, I want requests I can confirm in one click, without double-booking myself.

- **F5-AC1:** On a listing page, a signed-in homebuyer picks a date and a 30-minute slot. Slots run Monday to Saturday, 9:00 to 18:00 in the brokerage time zone, starting at least 1 hour from now and at most 30 days ahead.
- **F5-AC2:** Slots that are in the past, outside hours, or overlap the agent's confirmed showings are not offered. The server rejects them even if the request is forged.
- **F5-AC3:** A request creates a showing with status `Requested`, adds a lead activity, and notifies the agent.
- **F5-AC4:** The agent confirms or declines, with an optional reason. The buyer is emailed, and `/showings` shows the current status.
- **F5-AC5:** A confirmation that would overlap another confirmed showing for that agent is rejected, even when two confirmations arrive at the same moment.
- **F5-AC6:** The buyer can cancel a requested or confirmed showing up to 2 hours before it starts, and the agent is notified.
- **F5-AC7:** Two showings overlap when `startA < endB` and `startB < endA`. Back-to-back showings (one ends exactly when the next starts) are allowed.

### Cross-cutting requirements

- **Auth:** Homebuyers sign up with email and password. Agent and broker accounts are created by the seed script or the broker. Passwords are hashed by the auth library, and sessions use secure, httpOnly cookies.
- **UX:** Works on phones and desktops, can be used with the keyboard, has labeled form fields, and has loading, empty and error states on every page.
- **Errors:** Friendly error and not-found pages. Users never see stack traces.
- **Demo data:** 60 to 100 generated listings, seeded agents, broker and homebuyers, all fictional. Demo sign-ins are listed in the README and are test accounts only.

## 5. Non-functional requirements

| Area | Requirement |
|---|---|
| Cost | $0: free tiers only (Vercel Hobby, Neon Free, Resend Free, GitHub Actions on a public repo) |
| Performance | Listing search responds in under 1 second for the demo data set |
| Security | OWASP Top 10:2025 practices, see [security.md](security.md) |
| Quality | 70%+ test coverage, all CI stages green on `main`, see [testing.md](testing.md) |
| Accessibility | Semantic HTML, labels, alt text, visible focus, color contrast at WCAG AA |

## 6. Definition of Done

A story is done when:

1. Every acceptance criterion is met, and each has at least one test that names its AC ID.
2. Domain logic was built test-first: a failing test commit, then a passing commit, then a refactor commit.
3. Lint, type check, unit and integration tests, and E2E tests (where relevant) pass in CI. Coverage stays at 70% or higher.
4. **Security:**
   - Input is validated on the server.
   - Authorization is checked in the data access layer.
   - No secrets are committed.
   - No new high or critical production advisories appear in `npm audit`.
   - The change was checked against the OWASP list in [security.md](security.md).
5. The PR is merged into `dev` with a merge commit, includes AI disclosure, and was reviewed by the partner and/or the AI review.
6. CLAUDE.md and the docs are updated if a convention changed.

## 7. Release plan

| Sprint | Dates | Goal |
|---|---|---|
| Sprint 1 | Nov 18 to Dec 4 | Claude Code setup and docs. HW4, due Nov 23: F1 search logic with TDD (Part 3), F2 scoring from a spec (Part 2). Then CI/CD pipeline, database, sign-in and roles, first Vercel deploy, F1 pages, F2 CRM, and Claude Code hooks, skills, MCP and agents. |
| Sprint 2 | Dec 5 to Dec 14 | F3 follow-ups, F4 broker dashboard and routing, F5 showings, E2E tests, polish, blog post and video. |

Two sprints, tracked on the [ClosePath project board](https://github.com/users/NHazelJ/projects/2) with the milestones `Sprint 1` and `Sprint 2`. Each issue is one branch and one PR.

The project idea must be approved in the #projects Slack channel by **Dec 9**; the target is this week.
