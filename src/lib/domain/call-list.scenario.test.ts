/**
 * SPEC section 11: one agent's morning, end to end. scoreLead, scoreBand and
 * buildCallList run together on 12 fictional leads, the way the /agent/leads
 * loader will use them (SPEC section 7).
 */
import { describe, expect, it } from "vitest";
import { buildCallList } from "@/lib/domain/call-list";
import {
  type LeadScoreInput,
  type LeadStatus,
  type ScoreBand,
  type ShowingStatus,
  scoreBand,
  scoreLead,
} from "@/lib/domain/lead-scoring";

/** 10:00am Thursday in LA (standard time). */
const NOW = new Date("2026-11-19T18:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

/** Ages are measured back from NOW. */
type Activity = {
  inquiries: number[];
  savedHomes?: number[];
  showing?: [ShowingStatus, number];
  lastContactedAt?: Date;
};

type ScenarioLead = LeadScoreInput & {
  id: string;
  lastContactedAt: Date | null;
  createdAt: Date;
};

/** createdAt equals the oldest inquiry. */
function scenarioLead(
  id: string,
  status: LeadStatus,
  phone: string | null,
  activity: Activity,
): ScenarioLead {
  const { inquiries, savedHomes = [], showing, lastContactedAt = null } =
    activity;
  return {
    id,
    status,
    phone,
    inquiries: inquiries.map((age) => ({ at: ago(age) })),
    savedHomes: savedHomes.map((age) => ({ savedAt: ago(age) })),
    showingRequests:
      showing === undefined
        ? []
        : [{ status: showing[0], requestedAt: ago(showing[1]) }],
    lastContactedAt,
    createdAt: ago(Math.max(...inquiries)),
  };
}

const LEADS: ScenarioLead[] = [
  scenarioLead("lead-01", "NEW", "555-0101", {
    inquiries: [2 * HOUR, 26 * HOUR, 3 * DAY],
    savedHomes: [3 * HOUR, 5 * HOUR, DAY, 2 * DAY],
    showing: ["REQUESTED", HOUR],
  }),
  scenarioLead("lead-02", "CONTACTED", null, {
    inquiries: [7 * DAY],
    lastContactedAt: ago(DAY),
  }),
  scenarioLead("lead-03", "SHOWING", "   ", {
    inquiries: [10 * DAY],
    showing: ["DECLINED", 2 * DAY],
    lastContactedAt: ago(2 * DAY),
  }),
  scenarioLead("lead-04", "NEW", "555-0104", {
    inquiries: [10 * DAY],
    showing: ["CANCELLED", 4 * HOUR],
  }),
  scenarioLead("lead-05", "CONTACTED", "555-0105", {
    inquiries: [3 * DAY],
    lastContactedAt: new Date("2026-11-19T07:30:00Z"), // 11:30pm yesterday in LA
  }),
  scenarioLead("lead-06", "NEW", "555-0106", { inquiries: [3 * DAY] }),
  scenarioLead("lead-07", "CONTACTED", "555-0107", {
    inquiries: [2 * DAY],
    savedHomes: [2 * DAY],
    lastContactedAt: new Date("2026-11-19T08:30:00Z"), // 12:30am today in LA
  }),
  scenarioLead("lead-08", "CLOSED", "555-0108", {
    inquiries: [HOUR],
    showing: ["CONFIRMED", HOUR],
  }),
  scenarioLead("lead-09", "UNDER_CONTRACT", "555-0109", {
    inquiries: [DAY],
    showing: ["CONFIRMED", 5 * DAY],
  }),
  scenarioLead("lead-10", "NEW", null, { inquiries: [31 * DAY] }),
  scenarioLead("lead-11", "CONTACTED", "555-0111", {
    inquiries: [30 * DAY],
    lastContactedAt: ago(3 * DAY),
  }),
  scenarioLead("lead-12", "NEW", null, { inquiries: [40 * DAY] }),
];

/** The Score and Band columns of the SPEC section 11 lead table. */
const EXPECTED_SCORES: [string, number, ScoreBand][] = [
  ["lead-01", 100, "HOT"],
  ["lead-02", 30, "COLD"],
  ["lead-03", 55, "WARM"],
  ["lead-04", 50, "WARM"],
  ["lead-05", 40, "WARM"],
  ["lead-06", 40, "WARM"],
  ["lead-07", 45, "WARM"],
  ["lead-08", 0, "COLD"],
  ["lead-09", 75, "HOT"],
  ["lead-10", 10, "COLD"],
  ["lead-11", 30, "COLD"],
  ["lead-12", 10, "COLD"],
];

/** Score on read, then build the list (the SPEC section 7 loader contract). */
const scored = LEADS.map((lead) => {
  const score = scoreLead(lead, NOW);
  return { ...lead, score, band: scoreBand(score) };
});

describe("an agent's morning (SPEC section 11)", () => {
  it.each(EXPECTED_SCORES)(
    "F2-AC5 F2-AC6 scores %s as %i (%s)",
    (id, score, band) => {
      expect(scored.find((lead) => lead.id === id)).toMatchObject({
        score,
        band,
      });
    },
  );

  it("F2-AC7 builds the call list in the expected order, leaving out lead-07, lead-08 and lead-09", () => {
    const callList = buildCallList(scored, NOW).map(({ id, score, band }) => [
      id,
      score,
      band,
    ]);
    expect(callList).toEqual([
      ["lead-01", 100, "HOT"],
      ["lead-03", 55, "WARM"],
      ["lead-04", 50, "WARM"],
      ["lead-06", 40, "WARM"],
      ["lead-05", 40, "WARM"],
      ["lead-11", 30, "COLD"],
      ["lead-02", 30, "COLD"],
      ["lead-12", 10, "COLD"],
      ["lead-10", 10, "COLD"],
    ]);
  });
});
