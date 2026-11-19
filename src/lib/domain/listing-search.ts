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
  const sorted = [...matches].sort((a, b) => {
    let diff = 0;
    if (query.sort === "newest") {
      diff = b.listedAt.getTime() - a.listedAt.getTime();
    } else if (query.sort === "price_asc") {
      diff = a.price - b.price;
    } else {
      diff = b.price - a.price;
    }
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const page = Math.min(Math.max(Math.trunc(query.page), 1), Math.max(pageCount, 1));
  const start = (page - 1) * PAGE_SIZE;
  return {
    items: sorted.slice(start, start + PAGE_SIZE),
    total: matches.length,
    page,
    pageCount,
    pageSize: PAGE_SIZE,
    isEmpty: matches.length === 0,
  };
}
