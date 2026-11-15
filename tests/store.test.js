import test from "node:test";
import assert from "node:assert/strict";
import { initState, seedHistory, seedMeds, save, clearSaved } from "../src/store.js";

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

test("initState creates demo data with six days of history and an 8:20 AM clock", () => {
  globalThis.localStorage = fakeStorage();
  const state = initState("2026-11-15");
  assert.equal(state.meds.length, seedMeds.length);
  assert.equal(state.demo, 8 * 60 + 20);
  assert.equal(Object.keys(state.taken).length, 7);
  assert.deepEqual(state.taken["2026-11-15"], {});
});

test("initState does not share objects with the seed data", () => {
  globalThis.localStorage = fakeStorage();
  const state = initState("2026-11-15");
  state.meds[0].pillsLeft = 0;
  assert.notEqual(seedMeds[0].pillsLeft, 0);
});

test("initState restores saved state", () => {
  globalThis.localStorage = fakeStorage();
  const first = initState("2026-11-15");
  first.meds.push({ id: "z", name: "Extra", dose: "1 mg", times: ["09:00"], from: "2026-11-15" });
  save(first);
  const second = initState("2026-11-15");
  assert.equal(second.meds.at(-1).name, "Extra");
});

test("initState recovers from corrupted storage", () => {
  globalThis.localStorage = fakeStorage({ "saathi-v1": "{not json" });
  const state = initState("2026-11-15");
  assert.equal(state.meds.length, seedMeds.length);
});

test("storage failures never throw", () => {
  globalThis.localStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  assert.doesNotThrow(() => initState("2026-11-15"));
  assert.doesNotThrow(() => save({}));
  assert.doesNotThrow(() => clearSaved());
});

test("seedHistory is deterministic", () => {
  const a = {};
  const b = {};
  const now = new Date(2026, 10, 15);
  seedHistory(seedMeds, a, now);
  seedHistory(seedMeds, b, now);
  assert.deepEqual(a, b);
  assert.ok(Object.values(a).some((day) => Object.keys(day).length > 0));
});
