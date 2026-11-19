import { describe, expect, it } from "vitest";
import {
  type ListingQuery,
  type ListingSummary,
  searchListings,
} from "@/lib/domain/listing-search";

// Fixture property types: the module must not depend on a hardcoded list.
const HOUSE = "HOUSE";
const CONDO = "CONDO";

let nextId = 1;
function makeListing(overrides: Partial<ListingSummary> = {}): ListingSummary {
  const id = String(nextId++).padStart(3, "0");
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
  const springfieldHouse = makeListing({ city: "Springfield", price: 400_000 });
  const shelbyvilleCondo = makeListing({
    city: "Shelbyville",
    propertyType: CONDO,
    price: 300_000,
    beds: 2,
    baths: 1,
  });
  const bigHouse = makeListing({ price: 900_000, beds: 5, baths: 3.5 });
  const soldHouse = makeListing({ status: "SOLD" });
  const pendingHouse = makeListing({ status: "PENDING" });
  const all = [
    springfieldHouse,
    shelbyvilleCondo,
    bigHouse,
    soldHouse,
    pendingHouse,
  ];

  it("F1-AC1 returns only ACTIVE listings", () => {
    const result = searchListings(all, query());
    expect(ids(result.items)).toEqual(
      ids([springfieldHouse, shelbyvilleCondo, bigHouse]),
    );
    expect(result.total).toBe(3);
  });

  it("F1-AC2 filters by city, ignoring case and surrounding spaces", () => {
    const result = searchListings(
      all,
      query({ filters: { city: "  shelbyVILLE " } }),
    );
    expect(ids(result.items)).toEqual([shelbyvilleCondo.id]);
  });

  it("F1-AC2 filters by min price (inclusive)", () => {
    const result = searchListings(
      all,
      query({ filters: { minPrice: 400_000 } }),
    );
    expect(ids(result.items)).toEqual(ids([springfieldHouse, bigHouse]));
  });

  it("F1-AC2 filters by max price (inclusive)", () => {
    const result = searchListings(
      all,
      query({ filters: { maxPrice: 400_000 } }),
    );
    expect(ids(result.items)).toEqual(
      ids([springfieldHouse, shelbyvilleCondo]),
    );
  });

  it("F1-AC2 filters by min beds", () => {
    const result = searchListings(all, query({ filters: { minBeds: 4 } }));
    expect(ids(result.items)).toEqual([bigHouse.id]);
  });

  it("F1-AC2 filters by min baths, allowing half baths", () => {
    const result = searchListings(all, query({ filters: { minBaths: 2.5 } }));
    expect(ids(result.items)).toEqual([bigHouse.id]);
  });

  it("F1-AC2 filters by property type supplied by the data", () => {
    const trailer = makeListing({ propertyType: "TRAILER" });
    const result = searchListings(
      [...all, trailer],
      query({ filters: { propertyType: "TRAILER" } }),
    );
    expect(ids(result.items)).toEqual([trailer.id]);
  });

  it("F1-AC2 combines every filter so results match all of them", () => {
    const result = searchListings(
      all,
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
    expect(ids(result.items)).toEqual(ids([springfieldHouse, bigHouse]));

    const narrower = searchListings(
      all,
      query({ filters: { city: "Springfield", maxPrice: 500_000 } }),
    );
    expect(ids(narrower.items)).toEqual([springfieldHouse.id]);
  });
});

describe("searchListings sorting", () => {
  const older = makeListing({
    price: 600_000,
    listedAt: new Date("2026-10-01T00:00:00Z"),
  });
  const newer = makeListing({
    price: 300_000,
    listedAt: new Date("2026-11-10T00:00:00Z"),
  });
  const middle = makeListing({
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
    const b = makeListing({ id: "b", price: 500_000, listedAt: sameDay });
    const a = makeListing({ id: "a", price: 500_000, listedAt: sameDay });
    for (const sort of ["newest", "price_asc", "price_desc"] as const) {
      const result = searchListings([b, a], query({ sort }));
      expect(result.items.map((l) => l.id)).toEqual(["a", "b"]);
    }
  });

  it("F1-AC3 does not mutate the input array", () => {
    const input = [older, newer, middle];
    searchListings(input, query({ sort: "price_desc" }));
    expect(input).toEqual([older, newer, middle]);
  });
});
