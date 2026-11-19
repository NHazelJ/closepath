import { describe, expect, it } from "vitest";
import {
  parseListingSearchParams,
  type RawSearchParams,
} from "@/lib/validation/listing-search";

// Fixture list: the parser must accept whatever the data source supplies.
const OPTIONS = { propertyTypes: ["HOUSE", "CONDO", "TRAILER"] };

const parse = (raw: RawSearchParams) => parseListingSearchParams(raw, OPTIONS);

describe("parseListingSearchParams valid input", () => {
  it("F1-AC2 maps every valid URL param into the query", () => {
    const { query, warnings } = parse({
      city: " Springfield ",
      minPrice: "300000",
      maxPrice: "750000",
      minBeds: "3",
      minBaths: "1.5",
      type: "CONDO",
      sort: "price_desc",
      page: "2",
    });
    expect(warnings).toEqual([]);
    expect(query).toEqual({
      filters: {
        city: "Springfield",
        minPrice: 300_000,
        maxPrice: 750_000,
        minBeds: 3,
        minBaths: 1.5,
        propertyType: "CONDO",
      },
      sort: "price_desc",
      page: 2,
    });
  });

  it("F1-AC2 accepts a property type that only the data source knows about", () => {
    const { query, warnings } = parse({ type: "TRAILER" });
    expect(query.filters.propertyType).toBe("TRAILER");
    expect(warnings).toEqual([]);
  });

  it("F1-AC2 uses the first value when a param is repeated", () => {
    const { query } = parse({ city: ["Springfield", "Shelbyville"] });
    expect(query.filters.city).toBe("Springfield");
  });

  it("F1-AC2 treats empty or blank params as unset, without warnings", () => {
    // A filter form submits untouched fields as empty strings (?minPrice=).
    const { query, warnings } = parse({
      city: "  ",
      minPrice: "",
      maxPrice: " ",
      minBeds: "",
      minBaths: ["", "3"],
      type: "",
      sort: "",
      page: "",
    });
    expect(query).toEqual({ filters: {}, sort: "newest", page: 1 });
    expect(warnings).toEqual([]);
  });

  it("F1-AC2 allows min price equal to max price", () => {
    const { query, warnings } = parse({ minPrice: "500000", maxPrice: "500000" });
    expect(query.filters).toEqual({ minPrice: 500_000, maxPrice: 500_000 });
    expect(warnings).toEqual([]);
  });
});

describe("parseListingSearchParams invalid input", () => {
  it.each([
    ["minPrice", "-5", /min price/i],
    ["minPrice", "abc", /min price/i],
    ["minPrice", "1000.50", /min price/i],
    ["maxPrice", "-1", /max price/i],
    ["maxPrice", "Infinity", /max price/i],
    ["minBeds", "1.5", /beds/i],
    ["minBeds", "two", /beds/i],
    ["minBaths", "-0.5", /baths/i],
    ["minBaths", "lots", /baths/i],
  ])("F1-AC5 ignores %s=%s with a message", (key, value, message) => {
    const { query, warnings } = parse({ [key]: value });
    expect(query.filters).toEqual({});
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(message);
  });

  it("F1-AC5 ignores an unknown property type with a message", () => {
    const { query, warnings } = parse({ type: "CASTLE" });
    expect(query.filters.propertyType).toBeUndefined();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/property type/i);
  });

  it("F1-AC5 falls back to newest for an unknown sort, with a message", () => {
    const { query, warnings } = parse({ sort: "cheapest" });
    expect(query.sort).toBe("newest");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/sort/i);
  });

  it.each(["0", "-2", "1.5", "next"])(
    "F1-AC5 falls back to page 1 for page=%s, with a message",
    (value) => {
      const { query, warnings } = parse({ page: value });
      expect(query.page).toBe(1);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/page/i);
    },
  );

  it("F1-AC5 ignores both prices when min price is above max price", () => {
    const { query, warnings } = parse({
      minPrice: "800000",
      maxPrice: "200000",
    });
    expect(query.filters.minPrice).toBeUndefined();
    expect(query.filters.maxPrice).toBeUndefined();
    expect(warnings).toEqual([
      "Min price is above max price, so the price filter was ignored.",
    ]);
  });

  it("F1-AC5 keeps valid filters next to invalid ones", () => {
    const { query, warnings } = parse({
      city: "Springfield",
      minPrice: "-100",
      minBeds: "2",
      minBaths: "nope",
      type: "HOUSE",
    });
    expect(query.filters).toEqual({
      city: "Springfield",
      minBeds: 2,
      propertyType: "HOUSE",
    });
    expect(warnings).toHaveLength(2);
  });
});
