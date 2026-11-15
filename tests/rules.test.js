import test from "node:test";
import assert from "node:assert/strict";
import { localCheck, bySeverity } from "../src/rules.js";

const existing = [{ name: "Aspirin" }, { name: "Metformin" }];

test("flags warfarin with aspirin as high severity", () => {
  const out = localCheck([{ name: "Warfarin" }], existing);
  const hit = out.find((w) => w.title === "Warfarin with aspirin");
  assert.ok(hit);
  assert.equal(hit.severity, "high");
});

test("flags warfarin with an anti-inflammatory painkiller", () => {
  const out = localCheck([{ name: "Warfarin" }, { name: "Ibuprofen" }], []);
  assert.ok(out.some((w) => w.title.startsWith("Warfarin with an anti-inflammatory")));
});

test("flags aspirin with ibuprofen as medium", () => {
  const out = localCheck([{ name: "Ibuprofen" }], existing);
  const hit = out.find((w) => w.title === "Aspirin with another painkiller");
  assert.equal(hit.severity, "medium");
});

test("does not flag pairs that are both already on the schedule", () => {
  const both = [{ name: "Warfarin" }, { name: "Aspirin" }];
  assert.deepEqual(localCheck([{ name: "Vitamin D" }], both), []);
});

test("returns nothing for a safe addition", () => {
  assert.deepEqual(localCheck([{ name: "Pantoprazole" }], existing), []);
});

test("matching is case insensitive", () => {
  const out = localCheck([{ name: "WARFARIN" }], existing);
  assert.ok(out.some((w) => w.title === "Warfarin with aspirin"));
});

test("reports a duplicate medicine", () => {
  const out = localCheck([{ name: "Metformin" }], existing);
  const dup = out.find((w) => w.source === "Duplicate check");
  assert.ok(dup);
  assert.equal(dup.severity, "low");
});

test("does not report the same rule twice", () => {
  const out = localCheck([{ name: "Warfarin" }, { name: "Warfarin" }], existing);
  assert.equal(out.filter((w) => w.title === "Warfarin with aspirin").length, 1);
});

test("bySeverity sorts high before medium before low", () => {
  const sorted = [{ severity: "low" }, { severity: "high" }, { severity: "medium" }].sort(bySeverity);
  assert.deepEqual(sorted.map((w) => w.severity), ["high", "medium", "low"]);
});
