/**
 * Refill tracking. Each medicine can carry `pillsLeft`; every taken dose uses
 * one pill. A medicine without `pillsLeft` is simply not tracked.
 */

import { REFILL_WARN_DAYS } from "./config.js";

/** @param {import("./types.js").Medicine} med */
export const isTracked = (med) => typeof med.pillsLeft === "number";

/** Whole days of supply left at the normal pace, or null when not tracked. */
export function daysLeft(med) {
  if (!isTracked(med) || med.times.length === 0) return null;
  return Math.floor(med.pillsLeft / med.times.length);
}

/** Medicines running low, fewest days first. */
export function lowSupply(meds, threshold = REFILL_WARN_DAYS) {
  return meds
    .map((med) => ({ med, days: daysLeft(med) }))
    .filter((x) => x.days !== null && x.days <= threshold)
    .sort((a, b) => a.days - b.days);
}

/** Use (delta -1) or give back (delta +1) one pill. Never goes below zero. */
export function adjustSupply(med, delta) {
  if (!isTracked(med)) return;
  med.pillsLeft = Math.max(0, med.pillsLeft + delta);
}

/** Plain language line, for example "Metformin: about 4 days left". */
export function describeSupply({ med, days }) {
  if (days === 0) return `${med.name}: refill now`;
  return `${med.name}: about ${days} day${days === 1 ? "" : "s"} left`;
}
