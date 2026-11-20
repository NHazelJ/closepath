import { describe, expect, it } from "vitest";
import {
  type CallListCandidate,
  buildCallList,
  isContactedToday,
} from "@/lib/domain/call-list";
import type { LeadStatus } from "@/lib/domain/lead-scoring";

/** 10:00am Thursday in LA (standard time). Midnight in LA was 08:00Z. */
const NOW = new Date("2026-11-19T18:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const later = (ms: number) => new Date(NOW.getTime() + ms);

/** A fictional open lead, never contacted; every test passes its own id. */
function makeCandidate(
  id: string,
  overrides: Partial<CallListCandidate> = {},
): CallListCandidate {
  return {
    id,
    status: "NEW",
    score: 50,
    lastContactedAt: null,
    createdAt: ago(10 * DAY),
    ...overrides,
  };
}

const idsOf = (leads: readonly CallListCandidate[]) =>
  buildCallList(leads, NOW).map((lead) => lead.id);

describe("isContactedToday", () => {
  it.each<[boolean, string, Date | null]>([
    [false, "that never happened (null)", null],
    [false, "at 11:59:59.999pm yesterday in LA", new Date("2026-11-19T07:59:59.999Z")],
    [true, "at midnight today in LA", new Date("2026-11-19T08:00:00.000Z")],
    [true, "earlier this morning", ago(2 * HOUR)],
    [true, "later than now on the same LA date", later(HOUR)],
    [true, "on a later LA date than now", later(2 * DAY)],
  ])("F2-AC7 is %s for a contact %s", (expected, _, lastContactedAt) => {
    expect(isContactedToday(lastContactedAt, NOW)).toBe(expected);
  });

  it("F2-AC7 compares LA dates in the evening, when UTC is already tomorrow", () => {
    const evening = new Date("2026-11-20T04:00:00.000Z"); // 8:00pm Nov 19 in LA
    const noonToday = new Date("2026-11-19T20:00:00.000Z"); // 12:00pm Nov 19 in LA
    const lateYesterday = new Date("2026-11-19T07:00:00.000Z"); // 11:00pm Nov 18 in LA
    expect(isContactedToday(noonToday, evening)).toBe(true);
    expect(isContactedToday(lateYesterday, evening)).toBe(false);
  });
});

describe("buildCallList eligibility", () => {
  it.each<LeadStatus>(["NEW", "CONTACTED", "SHOWING"])(
    "F2-AC7 includes an open %s lead",
    (status) => {
      expect(idsOf([makeCandidate("lead", { status })])).toEqual(["lead"]);
    },
  );

  it.each<LeadStatus>(["UNDER_CONTRACT", "CLOSED", "LOST"])(
    "F2-AC7 leaves out a %s lead",
    (status) => {
      expect(idsOf([makeCandidate("lead", { status, score: 100 })])).toEqual(
        [],
      );
    },
  );

  it("F2-AC7 leaves out leads contacted today by the LA calendar date", () => {
    const leads = [
      makeCandidate("after-now", { lastContactedAt: later(HOUR) }),
      makeCandidate("midnight-today", {
        lastContactedAt: new Date("2026-11-19T08:00:00.000Z"),
      }),
      makeCandidate("late-yesterday", {
        lastContactedAt: new Date("2026-11-19T07:59:59.999Z"),
      }),
    ];
    expect(idsOf(leads)).toEqual(["late-yesterday"]);
  });
});

describe("buildCallList order", () => {
  it("F2-AC7 puts higher scores first", () => {
    const leads = [
      makeCandidate("low", { score: 10 }),
      makeCandidate("high", { score: 90 }),
      makeCandidate("mid", { score: 50 }),
    ];
    expect(idsOf(leads)).toEqual(["high", "mid", "low"]);
  });

  it("F2-AC7 with equal scores, puts never-contacted leads first, then the one contacted longest ago", () => {
    const leads = [
      makeCandidate("contacted-1d", { lastContactedAt: ago(DAY) }),
      makeCandidate("contacted-5d", { lastContactedAt: ago(5 * DAY) }),
      makeCandidate("never", { lastContactedAt: null }),
    ];
    expect(idsOf(leads)).toEqual(["never", "contacted-5d", "contacted-1d"]);
  });

  it("F2-AC7 with equal score and last contact, puts the older createdAt first, then the smaller id", () => {
    const leads = [
      makeCandidate("b-newer", {
        lastContactedAt: ago(3 * DAY),
        createdAt: ago(5 * DAY),
      }),
      makeCandidate("c-older", {
        lastContactedAt: ago(3 * DAY),
        createdAt: ago(20 * DAY),
      }),
      makeCandidate("a-newer", {
        lastContactedAt: ago(3 * DAY),
        createdAt: ago(5 * DAY),
      }),
    ];
    expect(idsOf(leads)).toEqual(["c-older", "a-newer", "b-newer"]);
  });
});

describe("buildCallList size", () => {
  it("F2-AC7 returns at most 10 leads, dropping the lowest score", () => {
    // lead-06 has the lowest score, so neither the first nor the last id is dropped.
    const leads = Array.from({ length: 11 }, (_, i) =>
      makeCandidate(`lead-${String(i + 1).padStart(2, "0")}`, {
        score: i === 5 ? 1 : 50 + i,
      }),
    );
    const ids = idsOf(leads);
    expect(ids).toHaveLength(10);
    expect(ids).not.toContain("lead-06");
  });

  it("F2-AC7 counts only eligible leads toward the 10", () => {
    const leads = [
      makeCandidate("closed", { status: "CLOSED", score: 100 }),
      makeCandidate("called-today", { score: 100, lastContactedAt: ago(HOUR) }),
      ...Array.from({ length: 10 }, (_, i) => makeCandidate(`open-${i}`)),
    ];
    const ids = idsOf(leads);
    expect(ids).toHaveLength(10);
    expect(ids).not.toContain("closed");
    expect(ids).not.toContain("called-today");
  });

  it("F2-AC7 returns every eligible lead when there are fewer than 10", () => {
    const leads = ["a", "b", "c"].map((id) => makeCandidate(id));
    expect(idsOf(leads)).toEqual(["a", "b", "c"]);
  });

  it("F2-AC7 returns an empty list for no leads", () => {
    expect(buildCallList([], NOW)).toEqual([]);
  });
});

describe("buildCallList purity", () => {
  it("F2-AC7 never reorders the input and returns the same objects with extra fields", () => {
    const low = { ...makeCandidate("low", { score: 10 }), name: "Riley Example" };
    const high = { ...makeCandidate("high", { score: 90 }), name: "Jordan Sample" };
    const leads = [low, high];
    const result = buildCallList(leads, NOW);
    expect(leads).toEqual([low, high]);
    expect(result).not.toBe(leads);
    expect(result[0]).toBe(high);
    expect(result[1]).toBe(low);
    expect(result[0].name).toBe("Jordan Sample");
  });
});
