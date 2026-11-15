import test from "node:test";
import assert from "node:assert/strict";
import { buildDoctorSummary } from "../src/report.js";
import { weekSummary } from "../src/schedule.js";

const meds = [
  { id: "m1", name: "Metformin", dose: "500 mg", times: ["08:00", "20:00"], note: "With food", from: "2000-01-01", pillsLeft: 6 },
  { id: "m2", name: "Aspirin", dose: "75 mg", times: ["14:00"], from: "2000-01-01", pillsLeft: 30 },
];
const today = "2026-11-15";
const ctx = (now, taken = {}) => ({ meds, taken, today, now, person: "Ramesh" });

test("summary lists medicines, adherence and a disclaimer", () => {
  const c = ctx(15 * 60, { [today]: { "m1@08:00": 485 } });
  const week = weekSummary(meds, c.taken, today, c.now, 7, new Date(2026, 10, 15));
  const text = buildDoctorSummary(c, week, []);
  assert.match(text, /Medication summary for Ramesh/);
  assert.match(text, /- Metformin 500 mg, 8:00 AM and 8:00 PM \(With food\)/);
  assert.match(text, /- Aspirin 75 mg, 2:00 PM/);
  assert.match(text, /Adherence over the last 7 days/);
  assert.match(text, /not medical advice/);
});

test("summary names doses missed today", () => {
  const c = ctx(17 * 60);
  const week = weekSummary(meds, c.taken, today, c.now, 7, new Date(2026, 10, 15));
  const text = buildDoctorSummary(c, week, []);
  assert.match(text, /Missed today so far: Metformin at 8:00 AM, Aspirin at 2:00 PM\./);
});

test("summary says nothing was missed when all is well", () => {
  const c = ctx(60);
  const week = weekSummary(meds, c.taken, today, c.now, 7, new Date(2026, 10, 15));
  assert.match(buildDoctorSummary(c, week, []), /No missed doses today so far\./);
});

test("summary includes refill warnings", () => {
  const c = ctx(60);
  const week = weekSummary(meds, c.taken, today, c.now, 7, new Date(2026, 10, 15));
  const text = buildDoctorSummary(c, week, [{ med: meds[0], days: 3 }]);
  assert.match(text, /Running low: Metformin: about 3 days left\./);
});
