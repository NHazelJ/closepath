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
const SHOWING_POINTS = 25;
const SAVED_HOME_POINTS = 5;
const SAVED_HOMES_CAP = 15;
const INQUIRY_POINTS = 10;
const INQUIRIES_CAP = 20;
const PHONE_POINTS = 10;

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

/** Integer from 0 to 100. Pure: reads nothing but its arguments. */
export function scoreLead(lead: LeadScoreInput, now: Date): number {
  if (lead.status === "CLOSED" || lead.status === "LOST") return 0;

  const activityTimes = [
    ...lead.inquiries.map((inquiry) => inquiry.at.getTime()),
    ...lead.savedHomes.map((saved) => saved.savedAt.getTime()),
    ...lead.showingRequests.map((request) => request.requestedAt.getTime()),
  ];
  let recency = 0;
  if (activityTimes.length > 0) {
    const age = Math.max(0, now.getTime() - Math.max(...activityTimes));
    if (age <= DAY_MS) recency = 30;
    else if (age <= 7 * DAY_MS) recency = 20;
    else if (age <= 30 * DAY_MS) recency = 10;
  }

  const showing = lead.showingRequests.some(
    (request) => request.status !== "CANCELLED",
  )
    ? SHOWING_POINTS
    : 0;
  const saved = Math.min(
    SAVED_HOME_POINTS * lead.savedHomes.length,
    SAVED_HOMES_CAP,
  );
  const inquiries = Math.min(
    INQUIRY_POINTS * lead.inquiries.length,
    INQUIRIES_CAP,
  );
  const phone =
    lead.phone !== null && lead.phone.trim() !== "" ? PHONE_POINTS : 0;

  return recency + showing + saved + inquiries + phone;
}

/** HOT for 70 to 100, WARM for 40 to 69, COLD for 0 to 39. */
export function scoreBand(score: number): ScoreBand {
  if (score >= HOT_MIN) return "HOT";
  if (score >= WARM_MIN) return "WARM";
  return "COLD";
}
