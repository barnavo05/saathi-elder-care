/**
 * Pure scheduling helpers. No DOM access, so everything here is unit tested.
 * Times are "HH:MM" strings (24h) or minutes since midnight.
 */

export const pad = (n) => String(n).padStart(2, "0");

/** 14:05 as minutes (845) to "2:05 PM". */
export const fmt = (minutes) => {
  let h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${suffix}`;
};

/** "08:30" to 510. */
export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Local date as YYYY-MM-DD. */
export const dkey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Every dose scheduled for a day, sorted by time.
 * A medicine only counts from the day it was added (med.from).
 */
export function dosesFor(meds, day) {
  const out = [];
  for (const med of meds) {
    if (med.from > day) continue;
    for (const time of med.times) {
      out.push({ id: `${med.id}@${time}`, med, time, min: toMin(time) });
    }
  }
  return out.sort((a, b) => a.min - b.min);
}

/** A dose is "due" from 45 minutes before to 90 minutes after its time. */
export const DUE_BEFORE = 45;
export const DUE_AFTER = 90;

/**
 * Status of one dose: "taken" | "upcoming" | "due" | "missed".
 * @param taken map of day -> { doseId: minuteTaken }
 */
export function doseStatus(dose, day, taken, today, nowMinutes) {
  if (taken[day] && taken[day][dose.id] != null) return "taken";
  if (day < today) return "missed";
  if (nowMinutes < dose.min - DUE_BEFORE) return "upcoming";
  if (nowMinutes <= dose.min + DUE_AFTER) return "due";
  return "missed";
}

/** Counts only doses that are settled (taken or missed). */
export function dayStats(meds, taken, day, today, nowMinutes) {
  const settled = dosesFor(meds, day).filter((d) => {
    const s = doseStatus(d, day, taken, today, nowMinutes);
    return s === "taken" || s === "missed";
  });
  const done = settled.filter(
    (d) => doseStatus(d, day, taken, today, nowMinutes) === "taken"
  ).length;
  return {
    total: settled.length,
    taken: done,
    pct: settled.length ? Math.round((done / settled.length) * 100) : null,
  };
}

/** The last n calendar days ending today, oldest first. */
export function lastDays(n, now = new Date()) {
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push({ key: dkey(d), label: letters[d.getDay()] });
  }
  return out;
}
