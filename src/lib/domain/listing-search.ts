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

export function searchListings(
  listings: readonly ListingSummary[],
  query: ListingQuery,
): ListingSearchResult {
  const { city, minPrice, maxPrice, minBeds, minBaths, propertyType } =
    query.filters;
  const cityNeedle = city?.trim().toLowerCase();
  const matches = listings.filter(
    (l) =>
      l.status === "ACTIVE" &&
      (!cityNeedle || l.city.trim().toLowerCase() === cityNeedle) &&
      (minPrice === undefined || l.price >= minPrice) &&
      (maxPrice === undefined || l.price <= maxPrice) &&
      (minBeds === undefined || l.beds >= minBeds) &&
      (minBaths === undefined || l.baths >= minBaths) &&
      (propertyType === undefined || l.propertyType === propertyType),
  );
  return {
    items: matches,
    total: matches.length,
    page: 1,
    pageCount: 1,
    pageSize: PAGE_SIZE,
    isEmpty: false,
  };
}
