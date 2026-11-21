# UI design: wireframes

Three grayscale wireframes for the agent-facing app: a top bar, a left menu, and a main table or card area. Some menu items and buttons in them are ideas we won't build. The notes below map every part to a ClosePath feature, or mark it out of scope.

| Wireframe | File |
|---|---|
| Dashboard (agent home) | [`dashboard-wireframe.pdf`](dashboard-wireframe.pdf) |
| Contacts (lead list) | [`contacts-wireframe.pdf`](contacts-wireframe.pdf) |
| Listings (agent's listing table) | [`listings-wireframe.pdf`](listings-wireframe.pdf) |

## Shared layout

- **Top bar:** logo, search, "Add Contact" and the profile menu. "Add Contact" maps to creating a lead by hand. Mail, Tasks, History and Chat are out of scope.
- **Left menu, as ClosePath will name it:** Dashboard, Leads (the wireframe's "Contacts"), Listings, Showings, Outbox, plus Broker for the broker only. Vitals, Web & IDX, Marketing, LeadEngine and Marketplace are **out of scope** (PRD section 3).

## Dashboard → agent home

| Wireframe part | ClosePath | AC |
|---|---|---|
| Activity cards (contact, event type and time, property image) | Recent lead activity, newest first | F2-AC3 |
| Filters: New Leads, Hot Leads | Status `New`; score band Hot | F2-AC2, F2-AC6 |
| Card buttons: Email, Call | Email goes to the outbox; "Call" logs a call | F3-AC7, F2-AC4 |
| (not in the wireframe) | **Today's call list**, the top 10 leads to call | F2-AC7 |

Out of scope: Text (no SMS), New Texts, the promo banner, announcements, the mobile app and Company Cloud boxes, the promo card with "Boost", and the Tasks, Calendar and My Business tabs.

## Contacts → lead list (`/agent/leads`)

| Wireframe part | ClosePath | AC |
|---|---|---|
| Table: first and last name, phone, status, latest communication | Name, status, score, score band and last activity | F2-AC2 |
| Filters: Status, search | Filter by status; search by name or email | F2-AC2 |
| Filter: Agent Assigned | Broker only: see every agent's leads | F2-AC1, F4 |
| Smart lists: "New & Needs Contact", "Awaiting Response" | Today's call list (open leads not contacted today) | F2-AC7 |
| Smart list: "Agent Score" | Lead score and band | F2-AC5, F2-AC6 |
| Columns: Calls, Emails | Counts taken from the lead's timeline | F2-AC3 |

Out of scope: Texts, Video Message, Hashtags, saved filters, "Past Due Tasks", "Not on Listing Alerts", "Active on Website" and "Not on Campaigns" (unless the follow-up plans in F3 stay in scope).

## Listings → agent's listing table

The public `/listings` page for buyers is a card grid with filters (F1-AC1 to F1-AC5). This wireframe is the **agent's** table view of the same data.

| Wireframe part | ClosePath | AC |
|---|---|---|
| Columns: image, address, location, price, beds, baths, footage, agent, listing date | `Listing` fields: photos, address, city, price, beds, baths, sqft, agent, created date | F1-AC1 |
| Filters, Clear, Search, Count | Combined filters, "Clear filters", result count | F1-AC2, F1-AC4 |
| Tab: My Listings | Filter by listing agent | |

Out of scope: MLS Listings, Manual Listings, Just Sold and MLS ID (no MLS or IDX feed; listings are demo data), Half Baths (not in the data model), and the Boost Property, Present, Email, Text and Open House App buttons.
