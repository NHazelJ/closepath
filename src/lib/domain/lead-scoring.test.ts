import { describe, expect, it } from "vitest";
import { type ScoreBand, scoreBand } from "@/lib/domain/lead-scoring";

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
