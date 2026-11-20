/**
 * F2 lead scoring: turns a lead's buyer activity into a 0 to 100 score and a band.
 * Pure: no database, no clock. Callers pass `now`, and the score is computed on read.
 */

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "SHOWING",
  "UNDER_CONTRACT",
  "CLOSED",
  "LOST",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SHOWING_STATUSES = [
  "REQUESTED",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
] as const;
export type ShowingStatus = (typeof SHOWING_STATUSES)[number];

export const SCORE_BANDS = ["HOT", "WARM", "COLD"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

const HOT_MIN = 70;
const WARM_MIN = 40;

const DAY_MS = 86_400_000;

/** Points by the age of the latest buyer activity. Boundaries are inclusive (D1). */
const RECENCY_TIERS = [
  { maxAgeMs: DAY_MS, points: 30 },
  { maxAgeMs: 7 * DAY_MS, points: 20 },
  { maxAgeMs: 30 * DAY_MS, points: 10 },
] as const;

const SHOWING_POINTS = 25;
const SAVED_HOME_POINTS = 5;
const SAVED_HOMES_CAP = 15;
const INQUIRY_POINTS = 10;
const INQUIRIES_CAP = 20;
const PHONE_POINTS = 10;

const ZERO_SCORE_STATUSES = new Set<LeadStatus>(["CLOSED", "LOST"]);

/** Everything the score depends on. The DAL builds this from database rows. */
export type LeadScoreInput = {
  status: LeadStatus;
  phone: string | null;
  /** Every "Request info" submission for this lead, including the one that created it. */
  inquiries: readonly { at: Date }[];
  /** Homes the lead's buyer account has saved right now (an unsave removes one). */
  savedHomes: readonly { savedAt: Date }[];
  /** Every showing request by the lead's buyer account, in any status. */
  showingRequests: readonly { requestedAt: Date; status: ShowingStatus }[];
};

/**
 * Latest buyer activity of any kind in ms, or null when there is none.
 * Cancelled showing requests still count as activity (D4).
 */
function latestActivityTime(lead: LeadScoreInput): number | null {
  const times = [
    ...lead.inquiries.map((inquiry) => inquiry.at.getTime()),
    ...lead.savedHomes.map((saved) => saved.savedAt.getTime()),
    ...lead.showingRequests.map((request) => request.requestedAt.getTime()),
  ];
  return times.length === 0 ? null : Math.max(...times);
}

/** Activity after `now` (clock skew) counts as age 0. */
function recencyPoints(latest: number | null, now: Date): number {
  if (latest === null) return 0;
  const age = Math.max(0, now.getTime() - latest);
  return RECENCY_TIERS.find((tier) => age <= tier.maxAgeMs)?.points ?? 0;
}

const cappedPoints = (count: number, each: number, cap: number) =>
  Math.min(count * each, cap);

/** Any request that was not cancelled earns the bonus, once (D3). */
const hasLiveShowingRequest = (lead: LeadScoreInput) =>
  lead.showingRequests.some((request) => request.status !== "CANCELLED");

const hasPhone = (phone: string | null) =>
  phone !== null && phone.trim() !== "";

/** Integer from 0 to 100. Pure: reads nothing but its arguments. */
export function scoreLead(lead: LeadScoreInput, now: Date): number {
  if (ZERO_SCORE_STATUSES.has(lead.status)) return 0;
  return (
    recencyPoints(latestActivityTime(lead), now) +
    (hasLiveShowingRequest(lead) ? SHOWING_POINTS : 0) +
    cappedPoints(lead.savedHomes.length, SAVED_HOME_POINTS, SAVED_HOMES_CAP) +
    cappedPoints(lead.inquiries.length, INQUIRY_POINTS, INQUIRIES_CAP) +
    (hasPhone(lead.phone) ? PHONE_POINTS : 0)
  );
}

/** HOT for 70 to 100, WARM for 40 to 69, COLD for 0 to 39. */
export function scoreBand(score: number): ScoreBand {
  if (score >= HOT_MIN) return "HOT";
  if (score >= WARM_MIN) return "WARM";
  return "COLD";
}
