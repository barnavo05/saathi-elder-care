import test from "node:test";
import assert from "node:assert/strict";
import { fmt, toMin, dkey, dosesFor, doseStatus, dayStats, lastDays } from "../src/schedule.js";

const meds = [
  { id: "a", name: "Metformin", dose: "500 mg", times: ["20:00", "08:00"], from: "2000-01-01" },
  { id: "b", name: "Newdrug", dose: "1 mg", times: ["14:00"], from: "2026-11-15" },
];

test("toMin converts HH:MM to minutes", () => {
  assert.equal(toMin("00:00"), 0);
  assert.equal(toMin("08:30"), 510);
  assert.equal(toMin("23:59"), 1439);
});

test("fmt formats 12 hour clock including noon and midnight", () => {
  assert.equal(fmt(0), "12:00 AM");
  assert.equal(fmt(12 * 60), "12:00 PM");
  assert.equal(fmt(14 * 60 + 5), "2:05 PM");
  assert.equal(fmt(8 * 60 + 20), "8:20 AM");
});

test("dkey pads month and day", () => {
  assert.equal(dkey(new Date(2026, 0, 5)), "2026-01-05");
});

test("dosesFor sorts by time and respects the added date", () => {
  const before = dosesFor(meds, "2026-11-14");
  assert.deepEqual(before.map((d) => d.time), ["08:00", "20:00"]);
  const today = dosesFor(meds, "2026-11-15");
  assert.deepEqual(today.map((d) => d.time), ["08:00", "14:00", "20:00"]);
  assert.equal(today[0].id, "a@08:00");
});

test("doseStatus moves through upcoming, due and missed", () => {
  const dose = { id: "a@08:00", min: 480 };
  const today = "2026-11-15";
  assert.equal(doseStatus(dose, today, {}, today, 400), "upcoming");
  assert.equal(doseStatus(dose, today, {}, today, 440), "due");
  assert.equal(doseStatus(dose, today, {}, today, 570), "due");
  assert.equal(doseStatus(dose, today, {}, today, 571), "missed");
});

test("doseStatus reports taken regardless of time and missed for past days", () => {
  const dose = { id: "a@08:00", min: 480 };
  const today = "2026-11-15";
  assert.equal(doseStatus(dose, today, { [today]: { "a@08:00": 490 } }, today, 1000), "taken");
  assert.equal(doseStatus(dose, "2026-11-14", {}, today, 0), "missed");
});

test("dayStats ignores upcoming doses and computes a percentage", () => {
  const today = "2026-11-15";
  const taken = { [today]: { "a@08:00": 485 } };
  const stats = dayStats(meds, taken, today, today, 15 * 60);
  // 08:00 taken, 14:00 missed (past 15:30 window? 14:00+90=15:30, now 15:00 so due), 20:00 upcoming
  assert.equal(stats.total, 1);
  assert.equal(stats.taken, 1);
  assert.equal(stats.pct, 100);
  const later = dayStats(meds, taken, today, today, 16 * 60);
  assert.equal(later.total, 2);
  assert.equal(later.pct, 50);
});

test("dayStats returns null percent when nothing is settled", () => {
  const today = "2026-11-15";
  assert.equal(dayStats(meds, {}, today, today, 60).pct, null);
});

test("lastDays returns n days ending today, oldest first", () => {
  const days = lastDays(7, new Date(2026, 10, 15));
  assert.equal(days.length, 7);
  assert.equal(days[6].key, "2026-11-15");
  assert.equal(days[0].key, "2026-11-09");
});
