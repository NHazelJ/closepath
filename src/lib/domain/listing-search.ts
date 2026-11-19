/**
 * F1 listing search: pure filtering, sorting and pagination.
 * No database, no clock, no validation library. Callers pass already-parsed queries.
 */

export const SORT_OPTIONS = ["newest", "price_asc", "price_desc"] as const;
export const PAGE_SIZE = 20;

export type SortOption = (typeof SORT_OPTIONS)[number];

/** Property types are data-driven; callers supply the allowed values. */
export type PropertyType = string;

export type ListingStatus = "ACTIVE" | "PENDING" | "SOLD";

export type ListingSummary = {
  id: string;
  address: string;
  city: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: PropertyType;
  status: ListingStatus;
  photoUrl: string;
  listedAt: Date;
};

export type ListingFilters = {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  propertyType?: PropertyType;
};

export type ListingQuery = {
  filters: ListingFilters;
  sort: SortOption;
  page: number;
};

export type ListingSearchResult = {
  items: ListingSummary[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  isEmpty: boolean;
};

const normalizeCity = (city: string) => city.trim().toLowerCase();

/** True when the listing is active and satisfies every filter that is set. */
export function matchesFilters(
  listing: ListingSummary,
  filters: ListingFilters,
): boolean {
  const { city, minPrice, maxPrice, minBeds, minBaths, propertyType } = filters;
  const cityNeedle = city === undefined ? "" : normalizeCity(city);
  return (
    listing.status === "ACTIVE" &&
    (cityNeedle === "" || normalizeCity(listing.city) === cityNeedle) &&
    (minPrice === undefined || listing.price >= minPrice) &&
    (maxPrice === undefined || listing.price <= maxPrice) &&
    (minBeds === undefined || listing.beds >= minBeds) &&
    (minBaths === undefined || listing.baths >= minBaths) &&
    (propertyType === undefined || listing.propertyType === propertyType)
  );
}

const PRIMARY_ORDER: Record<
  SortOption,
  (a: ListingSummary, b: ListingSummary) => number
> = {
  newest: (a, b) => b.listedAt.getTime() - a.listedAt.getTime(),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
};

/** Comparator for a sort option, with ties broken by id (locale-independent). */
export function compareBy(
  sort: SortOption,
): (a: ListingSummary, b: ListingSummary) => number {
  const primary = PRIMARY_ORDER[sort];
  return (a, b) => {
    const diff = primary(a, b);
    if (diff !== 0) return diff;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function searchListings(
  listings: readonly ListingSummary[],
  query: ListingQuery,
): ListingSearchResult {
  const matches = listings
    .filter((listing) => matchesFilters(listing, query.filters))
    .sort(compareBy(query.sort));
  const pageCount = Math.ceil(matches.length / PAGE_SIZE);
  const page = clamp(Math.trunc(query.page), 1, Math.max(pageCount, 1));
  const start = (page - 1) * PAGE_SIZE;
  return {
    items: matches.slice(start, start + PAGE_SIZE),
    total: matches.length,
    page,
    pageCount,
    pageSize: PAGE_SIZE,
    isEmpty: matches.length === 0,
  };
}
