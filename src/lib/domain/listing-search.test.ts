import { describe, expect, it } from "vitest";
import {
  type ListingFilters,
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

function search(
  listings: readonly ListingSummary[],
  overrides: Partial<ListingQuery> = {},
) {
  return searchListings(listings, {
    filters: {},
    sort: "newest",
    page: 1,
    ...overrides,
  });
}

/** Ids of the matching listings, sorted, for order-independent checks. */
function searchIds(
  listings: readonly ListingSummary[],
  filters: ListingFilters,
): string[] {
  return search(listings, { filters })
    .items.map((l) => l.id)
    .sort();
}

describe("searchListings filters", () => {
  it("F1-AC1 returns only ACTIVE listings", () => {
    const listings = [
      makeListing("active"),
      makeListing("sold", { status: "SOLD" }),
      makeListing("pending", { status: "PENDING" }),
    ];
    expect(searchIds(listings, {})).toEqual(["active"]);
    expect(search(listings).total).toBe(1);
  });

  // [description, filter, listing that matches, listing that does not]
  it.each<
    [string, ListingFilters, Partial<ListingSummary>, Partial<ListingSummary>]
  >([
    [
      "city, ignoring case and surrounding spaces",
      { city: "  shelbyVILLE " },
      { city: "Shelbyville" },
      { city: "Springfield" },
    ],
    [
      "min price (inclusive)",
      { minPrice: 400_000 },
      { price: 400_000 },
      { price: 399_999 },
    ],
    [
      "max price (inclusive)",
      { maxPrice: 400_000 },
      { price: 400_000 },
      { price: 400_001 },
    ],
    ["min beds", { minBeds: 4 }, { beds: 5 }, { beds: 3 }],
    ["min baths, allowing half baths", { minBaths: 2.5 }, { baths: 3.5 }, { baths: 2 }],
    [
      "property type supplied by the data",
      { propertyType: "TRAILER" },
      { propertyType: "TRAILER" },
      { propertyType: HOUSE },
    ],
  ])("F1-AC2 filters by %s", (_, filters, match, miss) => {
    const listings = [makeListing("match", match), makeListing("miss", miss)];
    expect(searchIds(listings, filters)).toEqual(["match"]);
  });

  it("F1-AC2 with every filter set, returns only listings that match all of them", () => {
    const listings = [
      makeListing("small-house", { price: 400_000 }),
      makeListing("big-house", { price: 900_000, beds: 5, baths: 3.5 }),
      makeListing("shelbyville-condo", {
        city: "Shelbyville",
        propertyType: CONDO,
        price: 300_000,
        beds: 2,
        baths: 1,
      }),
    ];
    const filters: ListingFilters = {
      city: "Springfield",
      minPrice: 350_000,
      maxPrice: 1_000_000,
      minBeds: 3,
      minBaths: 2,
      propertyType: HOUSE,
    };
    expect(searchIds(listings, filters)).toEqual(["big-house", "small-house"]);
  });

  it("F1-AC2 with two filters set, excludes a listing that fails either one", () => {
    const listings = [
      makeListing("cheap-springfield", { price: 400_000 }),
      makeListing("pricy-springfield", { price: 900_000 }),
      makeListing("cheap-shelbyville", { city: "Shelbyville", price: 300_000 }),
    ];
    expect(
      searchIds(listings, { city: "Springfield", maxPrice: 500_000 }),
    ).toEqual(["cheap-springfield"]);
  });
});

describe("searchListings sorting", () => {
  // Read-only: no test changes these.
  const listings = [
    makeListing("older", { price: 600_000, listedAt: new Date("2026-10-01T00:00:00Z") }),
    makeListing("newer", { price: 300_000, listedAt: new Date("2026-11-10T00:00:00Z") }),
    makeListing("middle", { price: 450_000, listedAt: new Date("2026-10-20T00:00:00Z") }),
  ];

  it.each<[ListingQuery["sort"], string, string[]]>([
    ["newest", "newest first", ["newer", "middle", "older"]],
    ["price_asc", "price low to high", ["newer", "middle", "older"]],
    ["price_desc", "price high to low", ["older", "middle", "newer"]],
  ])("F1-AC3 sorts %s (%s)", (sort, _, expected) => {
    expect(search(listings, { sort }).items.map((l) => l.id)).toEqual(expected);
  });

  it("F1-AC3 breaks ties by id so order is deterministic", () => {
    const sameDay = new Date("2026-11-05T00:00:00Z");
    const tied = [
      makeListing("b", { price: 500_000, listedAt: sameDay }),
      makeListing("a", { price: 500_000, listedAt: sameDay }),
    ];
    for (const sort of ["newest", "price_asc", "price_desc"] as const) {
      expect(search(tied, { sort }).items.map((l) => l.id)).toEqual(["a", "b"]);
    }
  });
});

describe("searchListings pagination", () => {
  // Read-only: 45 listings priced 1..45, so price_asc order is predictable.
  const listings = Array.from({ length: 45 }, (_, i) =>
    makeListing(`page-item-${i + 1}`, { price: i + 1 }),
  );
  const pageOf = (page: number) => search(listings, { sort: "price_asc", page });
  const prices = (page: number) => pageOf(page).items.map((l) => l.price);

  it("F1-AC1 returns 20 listings per page", () => {
    expect(pageOf(1).pageSize).toBe(20);
    expect(prices(1)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("F1-AC1 reports total and page count across pages", () => {
    expect(pageOf(2)).toMatchObject({ total: 45, pageCount: 3, page: 2 });
    expect(prices(2)[0]).toBe(21);
  });

  it("F1-AC1 returns the remainder on the last page", () => {
    expect(prices(3)).toEqual([41, 42, 43, 44, 45]);
  });

  it("F1-AC1 clamps a page past the end to the last page", () => {
    expect(pageOf(99).page).toBe(3);
    expect(prices(99)).toHaveLength(5);
  });
});

describe("searchListings empty results", () => {
  it("F1-AC4 flags an empty result when nothing matches", () => {
    const result = search([makeListing("springfield")], {
      filters: { city: "Nowhere" },
    });
    expect(result).toMatchObject({
      isEmpty: true,
      total: 0,
      items: [],
      page: 1,
      pageCount: 0,
    });
  });

  it("F1-AC4 flags an empty result when there are no listings", () => {
    expect(search([]).isEmpty).toBe(true);
  });
});
