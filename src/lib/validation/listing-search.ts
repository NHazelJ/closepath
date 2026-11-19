import type { ListingQuery } from "@/lib/domain/listing-search";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type ListingSearchParseOptions = {
  /** Allowed property types, supplied by the data source (never hardcoded here). */
  propertyTypes: readonly string[];
};

export type ListingSearchParseResult = {
  query: ListingQuery;
  warnings: string[];
};

export function parseListingSearchParams(
  raw: RawSearchParams,
  options: ListingSearchParseOptions,
): ListingSearchParseResult {
  void raw;
  void options;
  return { query: { filters: {}, sort: "newest", page: 1 }, warnings: [] };
}
