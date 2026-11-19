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
