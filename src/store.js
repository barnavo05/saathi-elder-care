/**
 * Persistence. Everything lives in the browser (localStorage), so no patient
 * data ever leaves the device. All storage calls are guarded because
 * localStorage can be unavailable (private mode, blocked cookies).
 */

import { dkey, dosesFor } from "./schedule.js";

const KEY = "saathi-v1";

/** @type {import("./types.js").Medicine[]} */
export const seedMeds = [
  { id: "m1", name: "Metformin", dose: "500 mg", times: ["08:00", "20:00"], note: "With food", from: "2000-01-01", pillsLeft: 9 },
  { id: "m2", name: "Amlodipine", dose: "5 mg", times: ["08:00"], note: "For blood pressure", from: "2000-01-01", pillsLeft: 24 },
  { id: "m3", name: "Aspirin", dose: "75 mg", times: ["14:00"], note: "After lunch", from: "2000-01-01", pillsLeft: 4 },
  { id: "m4", name: "Atorvastatin", dose: "10 mg", times: ["21:00"], note: "At bedtime", from: "2000-01-01", pillsLeft: 40 },
];

/** Deterministic pseudo random numbers so the demo history is stable. */
function makeRandom(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Fill the previous six days with realistic, slightly imperfect history. */
export function seedHistory(meds, taken, now = new Date()) {
  const rnd = makeRandom(11);
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dkey(d);
    taken[key] = {};
    for (const dose of dosesFor(meds, key)) {
      if (rnd() < 0.83) taken[key][dose.id] = dose.min + Math.floor(rnd() * 40);
    }
  }
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable, the app still works for this visit */
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Load saved state or create the demo state (clock starts at 8:20 AM). */
export function initState(today) {
  let state = read();
  if (!state || !Array.isArray(state.meds)) {
    state = { meds: structuredClone(seedMeds), taken: {}, demo: 8 * 60 + 20 };
    const [y, m, d] = today.split("-").map(Number);
    seedHistory(state.meds, state.taken, new Date(y, m - 1, d));
    save(state);
  }
  if (!state.taken[today]) state.taken[today] = {};
  return state;
}
