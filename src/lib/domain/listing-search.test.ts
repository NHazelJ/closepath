import { describe, expect, it } from "vitest";
import {
  type ListingQuery,
  type ListingSummary,
  searchListings,
} from "@/lib/domain/listing-search";

// Fixture property types: the module must not depend on a hardcoded list.
const HOUSE = "HOUSE";
const CONDO = "CONDO";

/** A fictional active listing; every test passes its own id. */
function makeListing(
  id: string,
  overrides: Partial<ListingSummary> = {},
): ListingSummary {
  return {
    id,
    address: `${id} Example St`,
    city: "Springfield",
    price: 500_000,
    beds: 3,
    baths: 2,
    sqft: 1_500,
    propertyType: HOUSE,
    status: "ACTIVE",
    photoUrl: `https://example.com/photos/${id}.jpg`,
    listedAt: new Date("2026-11-01T12:00:00Z"),
    ...overrides,
  };
}

function query(overrides: Partial<ListingQuery> = {}): ListingQuery {
  return { filters: {}, sort: "newest", page: 1, ...overrides };
}

function ids(listings: readonly ListingSummary[]): string[] {
  return listings.map((l) => l.id).sort();
}

describe("searchListings filters", () => {
  it("F1-AC1 returns only ACTIVE listings", () => {
    const active = makeListing("active");
    const sold = makeListing("sold", { status: "SOLD" });
    const pending = makeListing("pending", { status: "PENDING" });
    const result = searchListings([active, sold, pending], query());
    expect(ids(result.items)).toEqual(["active"]);
    expect(result.total).toBe(1);
  });

  it("F1-AC2 filters by city, ignoring case and surrounding spaces", () => {
    const shelbyville = makeListing("shelbyville", { city: "Shelbyville" });
    const springfield = makeListing("springfield", { city: "Springfield" });
    const result = searchListings(
      [shelbyville, springfield],
      query({ filters: { city: "  shelbyVILLE " } }),
    );
    expect(ids(result.items)).toEqual(["shelbyville"]);
  });

  it("F1-AC2 filters by min price (inclusive)", () => {
    const atMin = makeListing("at-min", { price: 400_000 });
    const below = makeListing("below", { price: 399_999 });
    const result = searchListings(
      [atMin, below],
      query({ filters: { minPrice: 400_000 } }),
    );
    expect(ids(result.items)).toEqual(["at-min"]);
  });

  it("F1-AC2 filters by max price (inclusive)", () => {
    const atMax = makeListing("at-max", { price: 400_000 });
    const above = makeListing("above", { price: 400_001 });
    const result = searchListings(
      [atMax, above],
      query({ filters: { maxPrice: 400_000 } }),
    );
    expect(ids(result.items)).toEqual(["at-max"]);
  });

  it("F1-AC2 filters by min beds", () => {
    const fiveBeds = makeListing("five-beds", { beds: 5 });
    const threeBeds = makeListing("three-beds", { beds: 3 });
    const result = searchListings(
      [fiveBeds, threeBeds],
      query({ filters: { minBeds: 4 } }),
    );
    expect(ids(result.items)).toEqual(["five-beds"]);
  });

  it("F1-AC2 filters by min baths, allowing half baths", () => {
    const threeAndHalf = makeListing("three-and-half", { baths: 3.5 });
    const two = makeListing("two", { baths: 2 });
    const result = searchListings(
      [threeAndHalf, two],
      query({ filters: { minBaths: 2.5 } }),
    );
    expect(ids(result.items)).toEqual(["three-and-half"]);
  });

  it("F1-AC2 filters by property type supplied by the data", () => {
    const trailer = makeListing("trailer", { propertyType: "TRAILER" });
    const house = makeListing("house", { propertyType: HOUSE });
    const result = searchListings(
      [trailer, house],
      query({ filters: { propertyType: "TRAILER" } }),
    );
    expect(ids(result.items)).toEqual(["trailer"]);
  });

  it("F1-AC2 with every filter set, returns only listings that match all of them", () => {
    const smallHouse = makeListing("small-house", { price: 400_000 });
    const bigHouse = makeListing("big-house", {
      price: 900_000,
      beds: 5,
      baths: 3.5,
    });
    const shelbyvilleCondo = makeListing("shelbyville-condo", {
      city: "Shelbyville",
      propertyType: CONDO,
      price: 300_000,
      beds: 2,
      baths: 1,
    });
    const result = searchListings(
      [smallHouse, bigHouse, shelbyvilleCondo],
      query({
        filters: {
          city: "Springfield",
          minPrice: 350_000,
          maxPrice: 1_000_000,
          minBeds: 3,
          minBaths: 2,
          propertyType: HOUSE,
        },
      }),
    );
    expect(ids(result.items)).toEqual(["big-house", "small-house"]);
  });

  it("F1-AC2 with two filters set, excludes a listing that fails either one", () => {
    const cheapSpringfield = makeListing("cheap-springfield", {
      price: 400_000,
    });
    const pricySpringfield = makeListing("pricy-springfield", {
      price: 900_000,
    });
    const cheapShelbyville = makeListing("cheap-shelbyville", {
      city: "Shelbyville",
      price: 300_000,
    });
    const result = searchListings(
      [cheapSpringfield, pricySpringfield, cheapShelbyville],
      query({ filters: { city: "Springfield", maxPrice: 500_000 } }),
    );
    expect(ids(result.items)).toEqual(["cheap-springfield"]);
  });
});

describe("searchListings sorting", () => {
  const older = makeListing("older", {
    price: 600_000,
    listedAt: new Date("2026-10-01T00:00:00Z"),
  });
  const newer = makeListing("newer", {
    price: 300_000,
    listedAt: new Date("2026-11-10T00:00:00Z"),
  });
  const middle = makeListing("middle", {
    price: 450_000,
    listedAt: new Date("2026-10-20T00:00:00Z"),
  });
  const all = [older, newer, middle];

  it("F1-AC3 sorts newest first", () => {
    const result = searchListings(all, query({ sort: "newest" }));
    expect(result.items.map((l) => l.id)).toEqual([
      newer.id,
      middle.id,
      older.id,
    ]);
  });

  it("F1-AC3 sorts by price low to high", () => {
    const result = searchListings(all, query({ sort: "price_asc" }));
    expect(result.items.map((l) => l.id)).toEqual([
      newer.id,
      middle.id,
      older.id,
    ]);
  });

  it("F1-AC3 sorts by price high to low", () => {
    const result = searchListings(all, query({ sort: "price_desc" }));
    expect(result.items.map((l) => l.id)).toEqual([
      older.id,
      middle.id,
      newer.id,
    ]);
  });

  it("F1-AC3 breaks ties by id so order is deterministic", () => {
    const sameDay = new Date("2026-11-05T00:00:00Z");
    const b = makeListing("b", { price: 500_000, listedAt: sameDay });
    const a = makeListing("a", { price: 500_000, listedAt: sameDay });
    for (const sort of ["newest", "price_asc", "price_desc"] as const) {
      const result = searchListings([b, a], query({ sort }));
      expect(result.items.map((l) => l.id)).toEqual(["a", "b"]);
    }
  });
});

describe("searchListings pagination", () => {
  // 45 listings, prices 1..45 so price_asc order is predictable.
  const many = Array.from({ length: 45 }, (_, i) =>
    makeListing(`page-item-${i + 1}`, { price: i + 1 }),
  );
  const pageOf = (page: number) =>
    searchListings(many, query({ sort: "price_asc", page }));

  it("F1-AC1 returns 20 listings per page", () => {
    const first = pageOf(1);
    expect(first.pageSize).toBe(20);
    expect(first.items).toHaveLength(20);
    expect(first.items[0]?.price).toBe(1);
    expect(first.items[19]?.price).toBe(20);
  });

  it("F1-AC1 reports total and page count across pages", () => {
    const second = pageOf(2);
    expect(second.total).toBe(45);
    expect(second.pageCount).toBe(3);
    expect(second.page).toBe(2);
    expect(second.items.map((l) => l.price)[0]).toBe(21);
  });

  it("F1-AC1 returns the remainder on the last page", () => {
    const last = pageOf(3);
    expect(last.items.map((l) => l.price)).toEqual([41, 42, 43, 44, 45]);
  });

  it("F1-AC1 clamps a page past the end to the last page", () => {
    const beyond = pageOf(99);
    expect(beyond.page).toBe(3);
    expect(beyond.items).toHaveLength(5);
  });
});

describe("searchListings empty results", () => {
  it("F1-AC4 flags an empty result when nothing matches", () => {
    const result = searchListings(
      [makeListing("springfield", { city: "Springfield" })],
      query({ filters: { city: "Nowhere" } }),
    );
    expect(result.isEmpty).toBe(true);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.pageCount).toBe(0);
  });

  it("F1-AC4 flags an empty result when there are no listings", () => {
    expect(searchListings([], query()).isEmpty).toBe(true);
  });
});
