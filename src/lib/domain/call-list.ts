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

const OPEN = new Set<LeadStatus>(OPEN_STATUSES);

const LA_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: BROKERAGE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The LA calendar date as `YYYY-MM-DD`, so a later date compares greater as a string. */
function laDateKey(date: Date): string {
  const { year, month, day } = Object.fromEntries(
    LA_DATE_FORMAT.formatToParts(date).map(
      (part) => [part.type, part.value] as const,
    ),
  );
  return `${year}-${month}-${day}`;
}

/** Ascending comparison without subtraction, so it is safe for strings and infinities. */
function ascending<V extends number | string>(a: V, b: V): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Never-contacted leads sort before any contact time. */
const contactOrder = (at: Date | null) =>
  at === null ? Number.NEGATIVE_INFINITY : at.getTime();

/** Score high to low, then never contacted, oldest contact, oldest createdAt, smaller id (D8). */
function compareCallOrder(a: CallListCandidate, b: CallListCandidate): number {
  return (
    ascending(b.score, a.score) ||
    ascending(contactOrder(a.lastContactedAt), contactOrder(b.lastContactedAt)) ||
    ascending(a.createdAt.getTime(), b.createdAt.getTime()) ||
    ascending(a.id, b.id)
  );
}

/** True when lastContactedAt falls on now's calendar date in LA, or later. */
export function isContactedToday(
  lastContactedAt: Date | null,
  now: Date,
): boolean {
  return (
    lastContactedAt !== null && laDateKey(lastContactedAt) >= laDateKey(now)
  );
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
  return leads
    .filter(
      (lead) =>
        OPEN.has(lead.status) && !isContactedToday(lead.lastContactedAt, now),
    )
    .sort(compareCallOrder)
    .slice(0, CALL_LIST_SIZE);
}
