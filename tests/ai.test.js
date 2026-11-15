import test from "node:test";
import assert from "node:assert/strict";
import { initAI, aiAvailable, aiImages, aiParse, aiReview, aiWeeklyNote } from "../src/ai.js";

test("without an AI capability everything degrades to null or empty", async () => {
  delete globalThis.window;
  assert.equal(await initAI(), false);
  assert.equal(aiAvailable(), false);
  assert.equal(await aiParse("Tab Aspirin 75 mg", null), null);
  assert.deepEqual(await aiReview([], []), []);
  assert.equal(await aiWeeklyNote("Ramesh", "x"), null);
});

function installFake(reply, { images = true, fail = false } = {}) {
  const calls = [];
  const sample = async (prompt, options) => {
    calls.push({ prompt, options });
    if (fail) throw new Error("rate limited");
    return { text: reply };
  };
  sample.limits = async () => ({ images });
  globalThis.window = { claude: { use: async (name) => (name === "sample" ? sample : null) } };
  return calls;
}

test("aiParse cleans fenced JSON and attaches a photo when supported", async () => {
  const calls = installFake('```json\n[{"name":"warfarin","dose":"5 mg","times":["18:00"],"instruction":"after food"}]\n```');
  assert.equal(await initAI(), true);
  assert.equal(aiImages(), true);
  const file = { type: "image/png", size: 10 };
  const items = await aiParse("", file);
  assert.deepEqual(items, [{ name: "Warfarin", dose: "5 mg", times: ["18:00"], instruction: "after food" }]);
  assert.deepEqual(calls[0].options.images, [file]);
});

test("aiParse returns null on failures or empty results", async () => {
  installFake("[]");
  await initAI();
  assert.equal(await aiParse("x", null), null);
  installFake("", { fail: true });
  await initAI();
  assert.equal(await aiParse("x", null), null);
});

test("aiReview keeps at most three valid warnings and normalises severity", async () => {
  installFake(JSON.stringify([
    { severity: "high", title: "A", plain: "a", drugs: ["Warfarin", "Aspirin"] },
    { severity: "weird", title: "B", plain: "b", drugs: [] },
    { title: "", plain: "skip me" },
    { severity: "low", title: "C", plain: "c" },
    { severity: "low", title: "D", plain: "d" },
  ]));
  await initAI();
  const out = await aiReview([{ name: "X", dose: "1", times: ["08:00"] }], [{ name: "Y", dose: "1", times: ["08:00"] }]);
  assert.equal(out.length, 3);
  assert.equal(out[0].source, "AI review");
  assert.deepEqual(out[0].drugs, ["warfarin", "aspirin"]);
  assert.equal(out[1].severity, "medium");
});

test("aiWeeklyNote trims the reply and returns null on failure", async () => {
  installFake("  Two short sentences.  ");
  await initAI();
  assert.equal(await aiWeeklyNote("Ramesh", "2026-11-15: 3/4"), "Two short sentences.");
  installFake("", { fail: true });
  await initAI();
  assert.equal(await aiWeeklyNote("Ramesh", "x"), null);
});
