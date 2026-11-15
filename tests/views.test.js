import test from "node:test";
import assert from "node:assert/strict";
import { viewToday } from "../src/views/today.js";
import { viewFamily } from "../src/views/family.js";
import { viewPrescription } from "../src/views/prescription.js";
import { esc } from "../src/text.js";

const today = "2026-11-15";
const meds = [
  { id: "m1", name: "Metformin", dose: "500 mg", times: ["08:00", "20:00"], note: "With food", from: "2000-01-01", pillsLeft: 9 },
  { id: "m2", name: "Aspirin", dose: "75 mg", times: ["14:00"], from: "2000-01-01", pillsLeft: 30 },
];
const ctx = (now, extra = {}) => ({ meds, taken: { [today]: {} }, today, now, person: "Ramesh", canSpeak: false, ...extra });
const familyView = { summary: "", summaryBusy: false, doctorText: "" };

test("esc escapes all HTML special characters and handles null", () => {
  assert.equal(esc('<img src=x onerror="a()">&\''), "&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;");
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
});

test("today view greets by time of day and shows the next dose", () => {
  const html = viewToday(ctx(8 * 60 + 20));
  assert.match(html, /Good morning/);
  assert.match(html, /Take now/);
  assert.match(html, /Metformin 500 mg/);
  assert.match(html, /role="progressbar"[^>]*aria-valuenow="0"/);
});

test("today view marks overdue doses and offers a late log", () => {
  const html = viewToday(ctx(16 * 60));
  assert.match(html, /Overdue/);
  assert.match(html, /Took it late/);
});

test("today view celebrates when everything is taken", () => {
  const taken = { [today]: { "m1@08:00": 485, "m1@20:00": 1210, "m2@14:00": 850 } };
  const html = viewToday(ctx(21 * 60, { taken }));
  assert.match(html, /All done for today/);
});

test("today view shows low supply and the read aloud button only when supported", () => {
  const html = viewToday(ctx(8 * 60 + 20, { canSpeak: true }));
  assert.match(html, /Refill soon/);
  assert.match(html, /Metformin: about 4 days left/);
  assert.match(html, /data-a="speak"/);
  assert.doesNotMatch(viewToday(ctx(8 * 60 + 20)), /data-a="speak"/);
});

test("views escape medicine names so markup cannot be injected", () => {
  const evil = [{ id: "x", name: "<script>alert(1)</script>", dose: "1 mg", times: ["08:00"], from: "2000-01-01" }];
  const html = viewToday(ctx(8 * 60, { meds: evil }));
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(viewFamily(ctx(8 * 60, { meds: evil }), familyView), /<script>/);
});

test("family view raises an alert for missed doses", () => {
  const html = viewFamily(ctx(16 * 60), familyView);
  assert.match(html, /role="alert"/);
  assert.match(html, /2 missed doses today/);
  assert.match(html, /Nudge Ramesh/);
});

test("family view is calm when nothing is missed", () => {
  const html = viewFamily(ctx(60), familyView);
  assert.match(html, /On track today/);
  assert.doesNotMatch(html, /Nudge/);
});

test("family view gives the chart a text alternative and shows the doctor summary", () => {
  const html = viewFamily(ctx(16 * 60), { ...familyView, doctorText: "Medication summary for Ramesh" });
  assert.match(html, /role="img" aria-label="Adherence by day\./);
  assert.match(html, /Medication summary for Ramesh/);
  assert.match(html, /data-a="copy-report"/);
});

test("prescription view shows warnings sorted by severity", () => {
  const rx = {
    text: "", file: null, busy: false, err: "", aiBusy: false,
    pending: [{ name: "Warfarin", dose: "5 mg", times: ["18:00"], instruction: "" }],
    warnings: [
      { severity: "low", title: "Low one", plain: "p", source: "Duplicate check" },
      { severity: "high", title: "High one", plain: "p", source: "Known interaction" },
    ],
  };
  const html = viewPrescription({ rx, ai: { available: false, images: false } });
  assert.ok(html.indexOf("High one") < html.indexOf("Low one"));
  assert.match(html, /built in reader/);
  assert.match(html, /Add to schedule/);
});

test("prescription view shows errors in an alert region", () => {
  const rx = { text: "", file: null, busy: false, err: "Paste it first", aiBusy: false, pending: null, warnings: [] };
  assert.match(viewPrescription({ rx, ai: { available: true, images: true } }), /role="alert">Paste it first/);
});
