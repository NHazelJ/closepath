import { z } from "zod";
import {
  type ListingFilters,
  type ListingQuery,
  SORT_OPTIONS,
} from "@/lib/domain/listing-search";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type ListingSearchParseOptions = {
  /** Allowed property types, supplied by the data source (never hardcoded here). */
  propertyTypes: readonly string[];
};

export type ListingSearchParseResult = {
  query: ListingQuery;
  warnings: string[];
};

// Plain digits only: rejects "-5", "1e3", "0x10" and "Infinity" before coercion.
const wholeNumberSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));

const decimalSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/)
  .transform(Number)
  .pipe(z.number().nonnegative().max(Number.MAX_SAFE_INTEGER));

const pageSchema = wholeNumberSchema.pipe(z.number().min(1));

export function buildListingSearchParamsSchema(
  options: ListingSearchParseOptions,
) {
  return z.object({
    city: z.string().min(1).max(100),
    minPrice: wholeNumberSchema,
    maxPrice: wholeNumberSchema,
    minBeds: wholeNumberSchema,
    minBaths: decimalSchema,
    type: z.string().refine((v) => options.propertyTypes.includes(v)),
    sort: z.enum(SORT_OPTIONS),
    page: pageSchema,
  });
}

const MESSAGES = {
  city: "City was too long, so it was ignored.",
  minPrice: "Min price must be a whole number of 0 or more, so it was ignored.",
  maxPrice: "Max price must be a whole number of 0 or more, so it was ignored.",
  minBeds: "Min beds must be a whole number of 0 or more, so it was ignored.",
  minBaths: "Min baths must be a number of 0 or more, so it was ignored.",
  type: "Unknown property type, so it was ignored.",
  sort: "Unknown sort order, so results are sorted by newest.",
  page: "Page must be a whole number of 1 or more, so page 1 is shown.",
} as const;

const PRICE_RANGE_MESSAGE =
  "Min price is above max price, so the price filter was ignored.";

/** First value of a param, trimmed; blank values count as unset. */
function firstValue(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Parses URL search params into a ListingQuery (F1-AC2). Each field is
 * validated on its own, so a bad value is dropped with a warning while the
 * valid ones are kept (F1-AC5). Never throws.
 */
export function parseListingSearchParams(
  raw: RawSearchParams,
  options: ListingSearchParseOptions,
): ListingSearchParseResult {
  const shape = buildListingSearchParamsSchema(options).shape;
  const warnings: string[] = [];

  function field<T>(
    key: keyof typeof MESSAGES,
    schema: z.ZodType<T>,
  ): T | undefined {
    const value = firstValue(raw[key]);
    if (value === undefined) return undefined;
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    warnings.push(MESSAGES[key]);
    return undefined;
  }

  const filters: ListingFilters = {};
  const city = field("city", shape.city);
  let minPrice = field("minPrice", shape.minPrice);
  let maxPrice = field("maxPrice", shape.maxPrice);
  const minBeds = field("minBeds", shape.minBeds);
  const minBaths = field("minBaths", shape.minBaths);
  const propertyType = field("type", shape.type);
  const sort = field("sort", shape.sort) ?? "newest";
  const page = field("page", shape.page) ?? 1;

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    warnings.push(PRICE_RANGE_MESSAGE);
    minPrice = undefined;
    maxPrice = undefined;
  }

  if (city !== undefined) filters.city = city;
  if (minPrice !== undefined) filters.minPrice = minPrice;
  if (maxPrice !== undefined) filters.maxPrice = maxPrice;
  if (minBeds !== undefined) filters.minBeds = minBeds;
  if (minBaths !== undefined) filters.minBaths = minBaths;
  if (propertyType !== undefined) filters.propertyType = propertyType;

  return { query: { filters, sort, page }, warnings };
}
