import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  LEAD_STATUSES,
  SHOWING_STATUSES,
  scoreLead,
} from "@/lib/domain/lead-scoring";

const dateArb = fc.date({
  min: new Date("2025-01-01T00:00:00Z"),
  max: new Date("2027-12-31T00:00:00Z"),
  noInvalidDate: true,
});

/** Any lead: every status, any phone string, 0 to 6 items in each list. */
const leadArb = fc.record({
  status: fc.constantFrom(...LEAD_STATUSES),
  phone: fc.option(fc.string(), { nil: null }),
  inquiries: fc.array(fc.record({ at: dateArb }), { maxLength: 6 }),
  savedHomes: fc.array(fc.record({ savedAt: dateArb }), { maxLength: 6 }),
  showingRequests: fc.array(
    fc.record({
      requestedAt: dateArb,
      status: fc.constantFrom(...SHOWING_STATUSES),
    }),
    { maxLength: 6 },
  ),
});

describe("scoreLead properties", () => {
  it("F2-AC8 always returns an integer from 0 to 100", () => {
    fc.assert(
      fc.property(leadArb, dateArb, (lead, now) => {
        const score = scoreLead(lead, now);
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }),
    );
  });

  it("F2-AC8 gives the same score for the same lead and now, and never mutates the lead", () => {
    fc.assert(
      fc.property(leadArb, dateArb, (lead, now) => {
        const before = structuredClone(lead);
        const first = scoreLead(lead, now);
        expect(scoreLead(lead, now)).toBe(first);
        expect(
          scoreLead(structuredClone(lead), new Date(now.getTime())),
        ).toBe(first);
        expect(lead).toEqual(before);
      }),
    );
  });

  it("F2-AC5 never lowers the score when one saved home or one inquiry is added", () => {
    fc.assert(
      fc.property(leadArb, dateArb, dateArb, (lead, now, at) => {
        const base = scoreLead(lead, now);
        const withSave = {
          ...lead,
          savedHomes: [...lead.savedHomes, { savedAt: at }],
        };
        const withInquiry = { ...lead, inquiries: [...lead.inquiries, { at }] };
        expect(scoreLead(withSave, now)).toBeGreaterThanOrEqual(base);
        expect(scoreLead(withInquiry, now)).toBeGreaterThanOrEqual(base);
      }),
    );
  });
});
