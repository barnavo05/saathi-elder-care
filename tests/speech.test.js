import test from "node:test";
import assert from "node:assert/strict";
import { canSpeak, speak } from "../src/speech.js";

test("speech is reported unavailable outside a browser and speak does not throw", () => {
  delete globalThis.window;
  assert.equal(canSpeak(), false);
  assert.equal(speak("hello"), false);
});

test("speak uses the speech synthesis API when present", () => {
  const spoken = [];
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  globalThis.window = { speechSynthesis: { cancel() {}, speak: (u) => spoken.push(u) } };
  assert.equal(canSpeak(), true);
  assert.equal(speak("Time for Metformin"), true);
  assert.equal(spoken[0].text, "Time for Metformin");
  assert.equal(spoken[0].rate, 0.9);
  delete globalThis.SpeechSynthesisUtterance;
  delete globalThis.window;
});
