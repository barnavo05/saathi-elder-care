import test from "node:test";
import assert from "node:assert/strict";
import { daysLeft, lowSupply, adjustSupply, describeSupply, isTracked } from "../src/refill.js";

const med = (name, times, pillsLeft) => ({ name, times, pillsLeft });

test("daysLeft divides pills by doses per day", () => {
  assert.equal(daysLeft(med("A", ["08:00", "20:00"], 9)), 4);
  assert.equal(daysLeft(med("B", ["08:00"], 24)), 24);
});

test("daysLeft is null when supply is not tracked", () => {
  assert.equal(isTracked({ name: "C", times: ["08:00"] }), false);
  assert.equal(daysLeft({ name: "C", times: ["08:00"] }), null);
});

test("lowSupply returns only low items, fewest days first", () => {
  const meds = [med("A", ["08:00"], 4), med("B", ["08:00"], 40), med("C", ["08:00", "20:00"], 6), { name: "D", times: ["08:00"] }];
  const low = lowSupply(meds, 5);
  assert.deepEqual(low.map((x) => x.med.name), ["C", "A"]);
});

test("adjustSupply uses and returns pills but never goes below zero", () => {
  const m = med("A", ["08:00"], 1);
  adjustSupply(m, -1);
  assert.equal(m.pillsLeft, 0);
  adjustSupply(m, -1);
  assert.equal(m.pillsLeft, 0);
  adjustSupply(m, +1);
  assert.equal(m.pillsLeft, 1);
});

test("adjustSupply ignores untracked medicines", () => {
  const m = { name: "X", times: ["08:00"] };
  adjustSupply(m, -1);
  assert.equal(m.pillsLeft, undefined);
});

test("describeSupply words the remaining days", () => {
  assert.equal(describeSupply({ med: { name: "Metformin" }, days: 4 }), "Metformin: about 4 days left");
  assert.equal(describeSupply({ med: { name: "Aspirin" }, days: 1 }), "Aspirin: about 1 day left");
  assert.equal(describeSupply({ med: { name: "Aspirin" }, days: 0 }), "Aspirin: refill now");
});
