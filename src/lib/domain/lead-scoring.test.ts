import { afterEach, describe, expect, it, vi } from "vitest";
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
/** 60 days old: earns no recency points, so a test can isolate one signal. */
const OLD = ago(60 * DAY);

/** A fictional NEW lead with no phone and no activity. It scores 0. */
function makeLead(overrides: Partial<LeadScoreInput> = {}): LeadScoreInput {
  return {
    status: "NEW",
    phone: null,
    inquiries: [],
    savedHomes: [],
    showingRequests: [],
    ...overrides,
  };
}

const scoreOf = (overrides: Partial<LeadScoreInput>) =>
  scoreLead(makeLead(overrides), NOW);

/** Every signal at its cap: 30 + 25 + 15 + 20 + 10 = 100. */
const MAXED: Omit<LeadScoreInput, "status"> = {
  phone: "555-0100",
  inquiries: [{ at: ago(3 * HOUR) }, { at: ago(2 * DAY) }],
  savedHomes: [
    { savedAt: ago(HOUR) },
    { savedAt: ago(5 * HOUR) },
    { savedAt: ago(DAY) },
  ],
  showingRequests: [{ requestedAt: ago(2 * HOUR), status: "REQUESTED" }],
};

describe("scoreLead recency", () => {
  // A lone CANCELLED request sets recency but earns no other points.
  it.each<[string, number, number]>([
    ["0 ms", 30, 0],
    ["exactly 1 day", 30, DAY],
    ["1 day + 1 ms", 20, DAY + 1],
    ["exactly 7 days", 20, 7 * DAY],
    ["7 days + 1 ms", 10, 7 * DAY + 1],
    ["exactly 30 days", 10, 30 * DAY],
    ["30 days + 1 ms", 0, 30 * DAY + 1],
  ])("F2-AC5 activity aged %s earns %i recency points", (_, points, age) => {
    expect(
      scoreOf({
        showingRequests: [{ requestedAt: ago(age), status: "CANCELLED" }],
      }),
    ).toBe(points);
  });

  // The recent item sits at a different position in each row.
  it.each<[string, Partial<LeadScoreInput>, number]>([
    [
      "an inquiry",
      {
        inquiries: [{ at: OLD }, { at: ago(2 * HOUR) }],
        savedHomes: [{ savedAt: OLD }],
      },
      30 + 20 + 5,
    ],
    [
      "a saved home",
      {
        inquiries: [{ at: OLD }],
        savedHomes: [{ savedAt: ago(2 * HOUR) }, { savedAt: OLD }],
      },
      30 + 10 + 10,
    ],
    [
      "a showing request",
      {
        inquiries: [{ at: OLD }],
        showingRequests: [
          { requestedAt: OLD, status: "CANCELLED" },
          { requestedAt: ago(2 * HOUR), status: "CANCELLED" },
        ],
      },
      30 + 10,
    ],
  ])(
    "F2-AC5 uses the latest activity of any kind when it is %s",
    (_, overrides, expected) => {
      expect(scoreOf(overrides)).toBe(expected);
    },
  );

  it("F2-AC5 gives activity after now 30 recency points and still counts it", () => {
    const future = new Date(NOW.getTime() + HOUR);
    expect(scoreOf({ inquiries: [{ at: future }] })).toBe(30 + 10);
  });

  it("F2-AC5 gives no recency points when there is no buyer activity", () => {
    expect(scoreOf({})).toBe(0);
    expect(scoreOf({ phone: "555-0100" })).toBe(10);
  });
});

describe("scoreLead signals", () => {
  it.each<ShowingStatus>(["REQUESTED", "CONFIRMED", "DECLINED"])(
    "F2-AC5 gives +25 for a %s showing request",
    (status) => {
      expect(scoreOf({ showingRequests: [{ requestedAt: OLD, status }] })).toBe(
        25,
      );
    },
  );

  it("F2-AC5 gives no showing bonus for a CANCELLED request alone", () => {
    expect(
      scoreOf({ showingRequests: [{ requestedAt: OLD, status: "CANCELLED" }] }),
    ).toBe(0);
  });

  it("F2-AC5 gives the showing bonus once, however many live requests", () => {
    expect(
      scoreOf({
        showingRequests: [
          { requestedAt: OLD, status: "CANCELLED" },
          { requestedAt: OLD, status: "REQUESTED" },
          { requestedAt: OLD, status: "CONFIRMED" },
        ],
      }),
    ).toBe(25);
  });

  it.each<[number, number]>([
    [1, 5],
    [3, 15],
    [4, 15],
  ])("F2-AC5 scores %i saved home(s) as %i points (capped at 15)", (count, points) => {
    const savedHomes = Array.from({ length: count }, () => ({ savedAt: OLD }));
    expect(scoreOf({ savedHomes })).toBe(points);
  });

  it.each<[number, number]>([
    [1, 10],
    [2, 20],
    [3, 20],
  ])("F2-AC5 scores %i inquiry(ies) as %i points (capped at 20)", (count, points) => {
    const inquiries = Array.from({ length: count }, () => ({ at: OLD }));
    expect(scoreOf({ inquiries })).toBe(points);
  });

  it.each<[number, string, string | null]>([
    [10, "a phone number", "555-0100"],
    [0, "null", null],
    [0, "an empty string", ""],
    [0, "a blank string", "   "],
  ])("F2-AC5 gives %i phone points for %s", (points, _, phone) => {
    expect(scoreOf({ phone })).toBe(points);
  });
});

describe("scoreLead statuses", () => {
  it.each<LeadStatus>(["CLOSED", "LOST"])(
    "F2-AC5 scores a %s lead 0 even with every signal at its maximum",
    (status) => {
      expect(scoreOf({ ...MAXED, status })).toBe(0);
    },
  );

  it.each<LeadStatus>(["NEW", "CONTACTED", "SHOWING", "UNDER_CONTRACT"])(
    "F2-AC5 scores a %s lead normally: every signal at its maximum gives exactly 100",
    (status) => {
      expect(scoreOf({ ...MAXED, status })).toBe(100);
    },
  );
});

describe("scoreLead determinism", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("F2-AC8 gives the same score whatever the system clock says", () => {
    // 3 days old: 20 recency points + 10 for the inquiry.
    const lead = makeLead({ inquiries: [{ at: ago(3 * DAY) }] });
    const clocks = [
      new Date("2001-01-01T00:00:00.000Z"),
      new Date("2049-06-15T12:00:00.000Z"),
    ];
    vi.useFakeTimers();
    const scores = clocks.map((clock) => {
      vi.setSystemTime(clock);
      expect(Date.now()).toBe(clock.getTime());
      return scoreLead(lead, NOW);
    });
    expect(scores).toEqual([30, 30]);
  });
});

describe("scoreBand", () => {
  it.each<[number, ScoreBand]>([
    [0, "COLD"],
    [39, "COLD"],
    [40, "WARM"],
    [69, "WARM"],
    [70, "HOT"],
    [100, "HOT"],
  ])("F2-AC6 puts a score of %i in the %s band", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });
});
