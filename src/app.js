/**
 * Saathi app shell. Holds state, wires events, and renders the pure view
 * modules into #app. Business logic lives in schedule, rules, parser, refill
 * and report so it can be unit tested without a browser.
 */

import { dkey, dosesFor, weekSummary } from "./schedule.js";
import { localCheck } from "./rules.js";
import { normItems, localParse } from "./parser.js";
import { initState, save, clearSaved } from "./store.js";
import { initAI, aiAvailable, aiImages, aiParse, aiReview, aiWeeklyNote } from "./ai.js";
import { adjustSupply } from "./refill.js";
import { canSpeak, speak } from "./speech.js";
import { PERSON, CLOCKS, TABS, SAMPLE_RX, DEFAULT_SUPPLY } from "./config.js";
import { esc } from "./escape.js";
import { $, toast, focusSelector, applySizes } from "./dom.js";
import { withFooter } from "./views/shared.js";
import { viewToday } from "./views/today.js";
import { viewPrescription } from "./views/prescription.js";
import { viewFamily, doctorText } from "./views/family.js";

const TODAY = dkey(new Date());
const freshRx = () => ({ text: "", file: null, pending: null, warnings: [], busy: false, err: "", aiBusy: false });

/** @type {import("./types.js").AppState} */
const state = initState(TODAY);
let view = "today";
let rx = freshRx();
const family = { summary: "", summaryBusy: false, doctorText: "" };
let focusHeading = false;

/* ---------- derived values ---------- */

function nowMinutes() {
  if (state.demo == null) {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
  return state.demo;
}

/** @returns {import("./types.js").ViewContext} */
const context = () => ({
  meds: state.meds,
  taken: state.taken,
  today: TODAY,
  now: nowMinutes(),
  person: PERSON,
  canSpeak: canSpeak(),
});

const notify = (message) => toast(message, esc);

/* ---------- rendering ---------- */

function renderBody() {
  if (view === "rx") return viewPrescription({ rx, ai: { available: aiAvailable(), images: aiImages() } });
  if (view === "family") return viewFamily(context(), family);
  return viewToday(context());
}

function render() {
  const keep = focusSelector(document.activeElement);

  $("#tabs").innerHTML = TABS.map(
    (t) => `<button class="tab${view === t.id ? " on" : ""}" data-a="nav" data-v="${t.id}"${view === t.id ? ' aria-current="page"' : ""}>${t.label}</button>`
  ).join("");
  $("#app").innerHTML = withFooter(renderBody());
  $("#demo-chips").innerHTML =
    CLOCKS.map((c) => `<button class="chip${state.demo === c.value ? " on" : ""}" data-a="clock" data-v="${c.value == null ? "" : c.value}" aria-pressed="${state.demo === c.value}">${c.label}</button>`).join("") +
    '<button class="chip" data-a="reset">Reset</button>';
  applySizes();

  const textarea = $("#rxtext");
  if (textarea) textarea.oninput = () => (rx.text = textarea.value);
  const file = $("#rxfile");
  if (file) file.onchange = () => { rx.file = file.files[0] || null; render(); };

  if (focusHeading) {
    focusHeading = false;
    const heading = $("#app h1");
    if (heading) heading.focus({ preventScroll: true });
  } else if (keep) {
    const el = $(keep);
    if (el) el.focus({ preventScroll: true });
  }
}

/* ---------- prescription flow ---------- */

async function readPrescription() {
  if (!rx.text.trim() && !rx.file) {
    rx.err = "Paste the prescription text or add a photo first.";
    return render();
  }
  Object.assign(rx, { busy: true, err: "", pending: null, warnings: [] });
  render();

  let items = await aiParse(rx.text, rx.file);
  if (!items && rx.text.trim()) items = normItems(localParse(rx.text));
  rx.busy = false;

  if (!items || !items.length) {
    rx.err = rx.text.trim()
      ? "No medicines found. Try one medicine per line, like: Tab Warfarin 5 mg once daily."
      : "I could not read that photo. Try pasting the text instead.";
    return render();
  }
  rx.pending = items;
  rx.warnings = localCheck(items, state.meds);
  render();
  reviewWithAI(items);
}

async function reviewWithAI(items) {
  if (!aiAvailable()) return;
  rx.aiBusy = true;
  render();
  const extra = await aiReview(state.meds, items);
  const known = rx.warnings.map((w) => w.pair || []);
  for (const w of extra) {
    const duplicate = known.some((pair) => pair.length && pair.every((n) => w.drugs.some((x) => n.includes(x) || x.includes(n))));
    if (!duplicate) rx.warnings.push(w);
  }
  rx.aiBusy = false;
  if (view === "rx") render();
}

function addToSchedule() {
  if (!rx.pending || !rx.pending.length) return;
  for (const p of rx.pending) {
    state.meds.push({
      id: `m${Date.now()}${Math.floor(Math.random() * 999)}`,
      name: p.name,
      dose: p.dose,
      times: p.times,
      note: p.instruction,
      from: TODAY,
      pillsLeft: DEFAULT_SUPPLY,
    });
  }
  const count = rx.pending.length;
  rx = freshRx();
  save(state);
  view = "today";
  focusHeading = true;
  render();
  notify(`${count} medicine${count > 1 ? "s" : ""} added to the schedule`);
}

/* ---------- dose actions ---------- */

function setTaken(doseId, taken) {
  const dose = dosesFor(state.meds, TODAY).find((d) => d.id === doseId);
  if (!dose) return;
  if (taken) {
    state.taken[TODAY][doseId] = nowMinutes();
    adjustSupply(dose.med, -1);
  } else if (state.taken[TODAY][doseId] != null) {
    delete state.taken[TODAY][doseId];
    adjustSupply(dose.med, +1);
  }
  save(state);
}

function readAloud(doseId) {
  const dose = dosesFor(state.meds, TODAY).find((d) => d.id === doseId);
  if (!dose) return;
  const note = dose.med.note ? `. ${dose.med.note}` : "";
  speak(`Time for ${dose.med.name}, ${dose.med.dose}${note}.`);
}

/* ---------- family actions ---------- */

async function writeWeeklyNote() {
  const ctx = context();
  const week = weekSummary(ctx.meds, ctx.taken, ctx.today, ctx.now);
  const counted = week.days.filter((d) => d.stats.pct !== null);
  const fallback = `${PERSON} took ${week.taken} of ${week.total} doses this week, about ${week.avg} percent. A short call around dinner time may help with the evening doses.`;
  family.summaryBusy = true;
  family.summary = "";
  render();
  const lines = counted.map((d) => `${d.key}: ${d.stats.taken}/${d.stats.total}`).join("; ");
  family.summary = (await aiWeeklyNote(PERSON, lines)) || fallback;
  family.summaryBusy = false;
  render();
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(family.doctorText);
    notify("Summary copied");
  } catch {
    notify("Select the text and copy it manually");
  }
}

/* ---------- events ---------- */

const ACTIONS = {
  nav: ({ v }) => { view = v; focusHeading = true; render(); window.scrollTo({ top: 0, behavior: "smooth" }); },
  take: ({ id }) => { setTaken(id, true); render(); notify("Logged. Your family can see it."); },
  untake: ({ id }) => { setTaken(id, false); render(); },
  speak: ({ id }) => readAloud(id),
  clock: ({ v }) => { state.demo = v === "" ? null : Number(v); save(state); render(); },
  reset: () => { clearSaved(); location.reload(); },
  sample: () => { Object.assign(rx, { text: SAMPLE_RX, pending: null, warnings: [], err: "" }); render(); },
  read: () => readPrescription(),
  rm: ({ i }) => { rx.pending.splice(Number(i), 1); rx.warnings = localCheck(rx.pending, state.meds); render(); },
  add: () => addToSchedule(),
  nudge: () => notify(`Nudge sent to ${PERSON} (simulated)`),
  summarise: () => writeWeeklyNote(),
  "make-report": () => { family.doctorText = doctorText(context()); render(); },
  "copy-report": () => copyReport(),
};

document.addEventListener("click", (event) => {
  const el = event.target.closest("[data-a]");
  if (!el) return;
  const handler = ACTIONS[el.dataset.a];
  if (handler) handler(el.dataset);
});

document.querySelector("[data-a='xl']").addEventListener("click", (event) => {
  const on = document.documentElement.classList.toggle("xl");
  event.currentTarget.setAttribute("aria-pressed", String(on));
});

render();
initAI().then((available) => { if (available) render(); });
