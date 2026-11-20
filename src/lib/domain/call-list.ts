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

const LA_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: BROKERAGE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const OPEN = new Set<LeadStatus>(OPEN_STATUSES);

/** True when lastContactedAt falls on now's calendar date in LA, or later. */
export function isContactedToday(
  lastContactedAt: Date | null,
  now: Date,
): boolean {
  if (lastContactedAt === null) return false;
  const toKey = (date: Date) => {
    const parts = Object.fromEntries(
      LA_DATE_FORMAT.formatToParts(date).map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  return toKey(lastContactedAt) >= toKey(now);
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
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      const aContact =
        a.lastContactedAt === null ? -Infinity : a.lastContactedAt.getTime();
      const bContact =
        b.lastContactedAt === null ? -Infinity : b.lastContactedAt.getTime();
      if (aContact !== bContact) return aContact < bContact ? -1 : 1;
      const created = a.createdAt.getTime() - b.createdAt.getTime();
      if (created !== 0) return created;
      if (a.id === b.id) return 0;
      return a.id < b.id ? -1 : 1;
    })
    .slice(0, CALL_LIST_SIZE);
}
