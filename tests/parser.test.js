import test from "node:test";
import assert from "node:assert/strict";
import { extractJSON, normItems, localParse, capitalise } from "../src/parser.js";

const SAMPLE = `Dr. A. Menon, General Physician
Patient: Ramesh Sharma, 72 M
1. Tab Warfarin 5 mg, once daily at 6 PM
2. Tab Pantoprazole 40 mg, before breakfast
3. Tab Ibuprofen 400 mg, twice daily after food`;

test("localParse reads the sample prescription", () => {
  const items = localParse(SAMPLE);
  assert.equal(items.length, 3);
  assert.deepEqual(items[0], { name: "Warfarin", dose: "5 mg", times: ["18:00"], instruction: "" });
  assert.deepEqual(items[1].times, ["07:30"]);
  assert.equal(items[1].instruction, "before breakfast");
  assert.deepEqual(items[2].times, ["08:00", "20:00"]);
  assert.equal(items[2].instruction, "after food");
});

test("localParse understands common abbreviations", () => {
  assert.deepEqual(localParse("Tab Amoxicillin 500 mg TDS")[0].times, ["08:00", "14:00", "20:00"]);
  assert.deepEqual(localParse("Tab Atorvastatin 10 mg at night")[0].times, ["21:00"]);
  assert.deepEqual(localParse("Cap Omeprazole 20 mg BD")[0].times, ["08:00", "20:00"]);
});

test("localParse handles explicit am and pm times", () => {
  assert.deepEqual(localParse("Tab Test 5 mg at 12 AM")[0].times, ["00:00"]);
  assert.deepEqual(localParse("Tab Test 5 mg at 12 PM")[0].times, ["12:00"]);
  assert.deepEqual(localParse("Tab Test 5 mg at 9:30 pm")[0].times, ["21:30"]);
});

test("localParse ignores lines that are not medicines and empty input", () => {
  assert.deepEqual(localParse("Patient: Ramesh Sharma\nReview in two weeks"), []);
  assert.deepEqual(localParse(""), []);
  assert.deepEqual(localParse(null), []);
});

test("extractJSON finds an array inside code fences and prose", () => {
  const reply = 'Here you go:\n```json\n[{"name":"A"}]\n```';
  assert.deepEqual(extractJSON(reply), [{ name: "A" }]);
});

test("extractJSON throws when there is no array", () => {
  assert.throws(() => extractJSON("no data here"));
});

test("normItems repairs bad times and trims fields", () => {
  const out = normItems([
    { name: " metformin ", dose: " 500 mg ", times: ["8:00", "bad", "20:00"] },
    { name: "Aspirin", times: [] },
    { dose: "no name" },
    null,
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, "Metformin");
  assert.deepEqual(out[0].times, ["08:00", "20:00"]);
  assert.deepEqual(out[1].times, ["08:00"]);
  assert.equal(out[1].instruction, "");
});

test("normItems tolerates non arrays", () => {
  assert.deepEqual(normItems(undefined), []);
  assert.deepEqual(normItems("x"), []);
});

test("capitalise handles empty strings", () => {
  assert.equal(capitalise(""), "");
  assert.equal(capitalise("abc"), "Abc");
});
