/**
 * F2 today's call list: up to 10 open leads nobody has contacted today, in call order.
 * Pure: no database, no clock. "Today" is the calendar date in the brokerage time zone.
 */
import type { LeadStatus } from "@/lib/domain/lead-scoring";

export const CALL_LIST_SIZE = 10;
export const BROKERAGE_TIME_ZONE = "America/Los_Angeles";
export const OPEN_STATUSES = [
  "NEW",
  "CONTACTED",
  "SHOWING",
] as const satisfies readonly LeadStatus[];

/** The fields the call list needs. `score` comes from scoreLead(). */
export type CallListCandidate = {
  id: string;
  status: LeadStatus;
  score: number;
  lastContactedAt: Date | null;
  createdAt: Date;
};

/** True when lastContactedAt falls on now's calendar date in LA, or later. */
export function isContactedToday(
  lastContactedAt: Date | null,
  now: Date,
): boolean {
  throw new Error("not implemented", { cause: { lastContactedAt, now } });
}

/**
 * Today's call list: at most CALL_LIST_SIZE open leads not contacted today, in
 * call order. Generic so callers can pass extra fields (name, band) through.
 * Returns a new array and never reorders or mutates the input.
 */
export function buildCallList<T extends CallListCandidate>(
  leads: readonly T[],
  now: Date,
): T[] {
  throw new Error("not implemented", { cause: { leads, now } });
}
