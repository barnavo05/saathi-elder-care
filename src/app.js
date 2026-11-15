/**
 * Saathi UI. Renders three views (Today, Prescription, Family) into #app.
 * All dynamic text goes through esc() before it reaches innerHTML, and the
 * page sets a strict Content Security Policy (see index.html).
 */

import { fmt, toMin, dkey, dosesFor, doseStatus, dayStats, lastDays } from "./schedule.js";
import { localCheck, bySeverity } from "./rules.js";
import { normItems, localParse } from "./parser.js";
import { initState, save, clearSaved } from "./store.js";
import { initAI, aiAvailable, aiImages, aiParse, aiReview, aiWeeklyNote } from "./ai.js";

const PERSON = "Ramesh";
const TODAY = dkey(new Date());
const SAMPLE_RX =
  "Dr. A. Menon, General Physician\nPatient: Ramesh Sharma, 72 M\n1. Tab Warfarin 5 mg, once daily at 6 PM\n2. Tab Pantoprazole 40 mg, before breakfast\n3. Tab Ibuprofen 400 mg, twice daily after food";

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const freshRx = () => ({ text: "", file: null, pending: null, warnings: [], busy: false, err: "", aiBusy: false });

let state = initState(TODAY);
let view = "today";
let rx = freshRx();
let summary = "";
let summaryBusy = false;
let focusHeading = false;

/* ---------- derived values ---------- */

function nowMinutes() {
  if (state.demo == null) {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
  return state.demo;
}
const statusOf = (dose) => doseStatus(dose, TODAY, state.taken, TODAY, nowMinutes());

/* ---------- small view helpers ---------- */

const statusLabel = (dose) => {
  const st = statusOf(dose);
  const at = state.taken[TODAY][dose.id];
  if (st === "taken") return `<span class="st ok">Taken ${fmt(at)}</span>`;
  if (st === "missed") return '<span class="st miss">Missed</span>';
  if (st === "due") return '<span class="st due">Due now</span>';
  return '<span class="st up">Later</span>';
};

function toast(message) {
  const box = $("#toastbox");
  box.innerHTML = `<div class="toast">${esc(message)}</div>`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (box.innerHTML = ""), 2800);
}

/* ---------- views ---------- */

function viewToday() {
  const doses = dosesFor(state.meds, TODAY);
  const now = nowMinutes();
  const takenCount = doses.filter((d) => statusOf(d) === "taken").length;
  const greeting = now < 720 ? "Good morning" : now < 1020 ? "Good afternoon" : "Good evening";
  const next = doses.find((d) => statusOf(d) !== "taken");
  const periods = [["Morning", 0, 720], ["Afternoon", 720, 1020], ["Evening", 1020, 1260], ["Night", 1260, 1441]];

  let h = `<div class="view"><p class="chap">01 / 03 &nbsp; TODAY</p><h1 tabindex="-1">${greeting},<br><em>${PERSON}.</em></h1>`;
  h += `<p class="sub">${fmt(now)} &middot; ${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}. One tap when you have taken a tablet. Your family is kept in the loop.</p>`;

  if (next) {
    const st = statusOf(next);
    const label = st === "missed" ? "Overdue" : st === "due" ? "Take now" : "Next dose";
    h += `<section class="next" aria-label="Next dose"><div><p class="lbl">${label} &middot; ${fmt(next.min)}</p><p class="big">${esc(next.med.name)} ${esc(next.med.dose)}</p><p class="note">${esc(next.med.note || "")}</p></div><button class="btn acc" data-a="take" data-id="${esc(next.id)}" aria-label="Mark ${esc(next.med.name)} as taken">I took it</button></section>`;
  } else {
    h += `<section class="good"><h2>All done for today.</h2><p class="sub wide">Every dose is taken. Well done, ${PERSON}.</p></section>`;
  }

  h += `<div class="prog"><b>${takenCount} of ${doses.length}</b> doses taken today<div class="bar" role="progressbar" aria-label="Doses taken today" aria-valuemin="0" aria-valuemax="${doses.length}" aria-valuenow="${takenCount}"><i data-w="${doses.length ? (takenCount / doses.length) * 100 : 0}"></i></div></div>`;

  for (const [name, from, to] of periods) {
    const list = doses.filter((d) => d.min >= from && d.min < to);
    if (!list.length) continue;
    h += `<section class="grp" aria-label="${name} doses"><h3>${name}</h3>`;
    for (const d of list) {
      const st = statusOf(d);
      let action;
      if (st === "taken") action = `${statusLabel(d)}<button class="link" data-a="untake" data-id="${esc(d.id)}" aria-label="Undo ${esc(d.med.name)}">undo</button>`;
      else if (st === "due") action = `<button class="btn sm" data-a="take" data-id="${esc(d.id)}" aria-label="Mark ${esc(d.med.name)} as taken">Mark taken</button>`;
      else if (st === "missed") action = `${statusLabel(d)}<button class="btn sm ghost gap" data-a="take" data-id="${esc(d.id)}" aria-label="Took ${esc(d.med.name)} late">Took it late</button>`;
      else action = '<span class="st up">Later today</span>';
      h += `<div class="row"><div class="t">${fmt(d.min)}</div><div><div class="n">${esc(d.med.name)} ${esc(d.med.dose)}</div><div class="d">${esc(d.med.note || "")}</div></div><div class="act">${action}</div></div>`;
    }
    h += "</section>";
  }
  return h + "</div>";
}

function viewPrescription() {
  const warnings = [...rx.warnings].sort(bySeverity);
  let h = '<div class="view"><p class="chap">02 / 03 &nbsp; NEW PRESCRIPTION</p><h1 tabindex="-1">Paste it.<br><em>We do the rest.</em></h1>';
  h += "<p class=\"sub\">Drop in the doctor's note. Saathi reads it, builds the schedule, and checks it against what is already being taken.</p>";
  h += '<div class="two"><section class="card" aria-labelledby="rx-h"><h2 id="rx-h">1. The prescription</h2>';
  h += `<label for="rxtext" class="sr-only">Prescription text, one medicine per line</label><textarea id="rxtext" class="mt-md" placeholder="One medicine per line, for example:\nTab Warfarin 5 mg, once daily at 6 PM">${esc(rx.text)}</textarea>`;
  h += `<div class="acts"><button class="btn acc" data-a="read"${rx.busy ? " disabled" : ""}>${rx.busy ? '<span class="spin" aria-hidden="true"></span>Reading' : "Read prescription"}</button><button class="btn ghost" data-a="sample">Use a sample</button>`;
  if (aiImages()) h += `<label class="btn ghost filebtn">${rx.file ? "Photo added" : "Add a photo"}<input id="rxfile" class="sr-only" type="file" accept="image/*"></label>`;
  h += "</div>";
  h += `<p class="hint">${aiAvailable() ? `Reads text${aiImages() ? " and photos" : ""} with AI.` : "AI is not available here, so a built in reader is used."} Not medical advice. Always confirm with the doctor or pharmacist.</p>`;
  if (rx.err) h += `<p class="hint strong" role="alert">${esc(rx.err)}</p>`;
  h += '</section><section class="card" aria-labelledby="found-h" aria-live="polite"><h2 id="found-h">2. What we found</h2>';

  if (!rx.pending) {
    h += '<p class="hint mt-md">Nothing yet. Try the sample prescription to see the safety check in action.</p>';
  } else {
    rx.pending.forEach((p, i) => {
      h += `<div class="med"><div><b>${esc(p.name)} ${esc(p.dose)}</b><div class="d">${p.times.map((t) => `<span class="pill">${fmt(toMin(t))}</span>`).join("")}${esc(p.instruction)}</div></div><button class="link" data-a="rm" data-i="${i}" aria-label="Remove ${esc(p.name)}">remove</button></div>`;
    });
    h += `<h2 class="mt-lg">3. Safety check${rx.aiBusy ? ' <span class="spin" aria-hidden="true"></span>' : ""}</h2>`;
    if (!warnings.length && !rx.aiBusy) h += '<div class="ok-box">No known problems found with the current medicines.</div>';
    for (const w of warnings) {
      const tag = w.severity === "high" ? "Talk to the doctor first" : w.severity === "medium" ? "Worth checking" : "Note";
      h += `<div class="warn ${esc(w.severity)}"><span class="tag">${tag} &middot; ${esc(w.source)}</span><strong>${esc(w.title)}</strong>${esc(w.plain)}</div>`;
    }
    h += `<div class="acts mt-md"><button class="btn" data-a="add"${rx.pending.length ? "" : " disabled"}>Add to schedule</button></div>`;
    h += '<p class="hint">Saathi never changes a dose. It flags, and the doctor decides.</p>';
  }
  return h + "</section></div></div>";
}

function viewFamily() {
  const doses = dosesFor(state.meds, TODAY);
  const missed = doses.filter((d) => statusOf(d) === "missed");
  const now = nowMinutes();
  const days = lastDays(7).map((d) => ({ ...d, stats: dayStats(state.meds, state.taken, d.key, TODAY, now) }));
  const counted = days.filter((d) => d.stats.pct != null);
  const total = counted.reduce((a, d) => a + d.stats.total, 0);
  const taken = counted.reduce((a, d) => a + d.stats.taken, 0);
  const avg = total ? Math.round((taken / total) * 100) : 0;
  const chartSummary = days.map((d) => `${d.label}: ${d.stats.pct == null ? "no data" : d.stats.pct + " percent"}`).join(", ");

  let h = `<div class="view"><p class="chap">03 / 03 &nbsp; FAMILY VIEW</p><h1 tabindex="-1">How is<br><em>${PERSON} doing?</em></h1>`;
  h += '<p class="sub">For the son, daughter or carer who lives far away. Calm when things are fine, loud only when they are not.</p>';

  if (missed.length) {
    h += `<section class="alert" role="alert"><div><h2>${missed.length} missed dose${missed.length > 1 ? "s" : ""} today</h2><p>${missed.map((d) => `${esc(d.med.name)} ${esc(d.med.dose)} at ${fmt(d.min)}`).join(" &middot; ")}</p></div><button class="btn acc" data-a="nudge">Nudge ${PERSON}</button></section>`;
    h += '<p class="hint">In production the nudge goes out as an SMS or WhatsApp message. Here it is simulated.</p>';
  } else {
    h += '<section class="good"><h2>On track today.</h2><p class="sub wide">No missed doses so far.</p></section>';
  }

  h += `<div class="stats"><div class="stat"><b>${avg}%</b><span>taken, last 7 days</span></div><div class="stat"><b>${taken}/${total}</b><span>doses logged</span></div><div class="stat"><b>${missed.length}</b><span>missed today</span></div></div>`;
  h += `<section class="card mt-lg" aria-labelledby="week-h"><h2 id="week-h">Last 7 days</h2><div class="chart" role="img" aria-label="Adherence by day. ${esc(chartSummary)}">`;
  days.forEach((d, i) => {
    h += `<div class="col${i === 6 ? " today" : ""}" aria-hidden="true"><em>${d.stats.pct == null ? "" : d.stats.pct + "%"}</em><i data-h="${d.stats.pct == null ? 4 : Math.max(4, d.stats.pct * 1.15)}"></i><small>${d.label}</small></div>`;
  });
  h += "</div></section>";
  h += `<section class="card mt-sm" aria-labelledby="note-h"><h2 id="note-h">Weekly note</h2><p class="sub wide ink" aria-live="polite">${summary ? esc(summary) : "A short plain language summary you can read in ten seconds, or forward to a sibling."}</p>`;
  h += `<div class="acts"><button class="btn sm" data-a="summarise"${summaryBusy ? " disabled" : ""}>${summaryBusy ? '<span class="spin" aria-hidden="true"></span>Writing' : "Write this week's note"}</button></div></section>`;
  h += '<section class="grp" aria-label="Today dose by dose"><h3>Today, dose by dose</h3>';
  for (const d of doses) {
    h += `<div class="row"><div class="t">${fmt(d.min)}</div><div><div class="n">${esc(d.med.name)} ${esc(d.med.dose)}</div></div><div class="act">${statusLabel(d)}</div></div>`;
  }
  return h + "</section></div>";
}

/* ---------- rendering ---------- */

const TABS = [["today", "Today"], ["rx", "Prescription"], ["family", "Family"]];
const CLOCKS = [["Live", null], ["8:20 AM", 8 * 60 + 20], ["2:30 PM", 14 * 60 + 30], ["9:45 PM", 21 * 60 + 45]];

function focusSelector(el) {
  if (!el) return null;
  if (el.id) return `#${el.id}`;
  const d = el.dataset || {};
  if (!d.a) return null;
  let sel = `[data-a="${d.a}"]`;
  if (d.id) sel += `[data-id="${CSS.escape(d.id)}"]`;
  if (d.v !== undefined) sel += `[data-v="${CSS.escape(d.v)}"]`;
  return sel;
}

function render() {
  const keep = focusSelector(document.activeElement);

  $("#tabs").innerHTML = TABS.map(
    ([id, label]) => `<button class="tab${view === id ? " on" : ""}" data-a="nav" data-v="${id}"${view === id ? ' aria-current="page"' : ""}>${label}</button>`
  ).join("");

  const body = view === "today" ? viewToday() : view === "rx" ? viewPrescription() : viewFamily();
  $("#app").innerHTML = `${body}<footer class="foot">Saathi means companion. Built solo for the Catalyst AI Hackathon 2026. Not a medical device and not medical advice.</footer>`;

  $("#demo-chips").innerHTML =
    CLOCKS.map(([label, value]) => `<button class="chip${state.demo === value ? " on" : ""}" data-a="clock" data-v="${value == null ? "" : value}" aria-pressed="${state.demo === value}">${label}</button>`).join("") +
    '<button class="chip" data-a="reset">Reset</button>';

  // Sizes are applied through the CSSOM so the strict CSP needs no inline styles.
  document.querySelectorAll("[data-w]").forEach((el) => (el.style.width = `${el.dataset.w}%`));
  document.querySelectorAll("[data-h]").forEach((el) => (el.style.height = `${el.dataset.h}px`));

  const textarea = $("#rxtext");
  if (textarea) textarea.oninput = () => (rx.text = textarea.value);
  const file = $("#rxfile");
  if (file) file.onchange = () => { rx.file = file.files[0] || null; render(); };

  if (focusHeading) {
    focusHeading = false;
    const h1 = $("#app h1");
    if (h1) h1.focus({ preventScroll: true });
  } else if (keep) {
    const el = $(keep);
    if (el) el.focus({ preventScroll: true });
  }
}

/* ---------- actions ---------- */

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
    state.meds.push({ id: `m${Date.now()}${Math.floor(Math.random() * 999)}`, name: p.name, dose: p.dose, times: p.times, note: p.instruction, from: TODAY });
  }
  const count = rx.pending.length;
  rx = freshRx();
  save(state);
  view = "today";
  focusHeading = true;
  render();
  toast(`${count} medicine${count > 1 ? "s" : ""} added to the schedule`);
}

async function writeSummary() {
  const days = lastDays(7)
    .map((d) => ({ ...d, stats: dayStats(state.meds, state.taken, d.key, TODAY, nowMinutes()) }))
    .filter((d) => d.stats.pct != null);
  const total = days.reduce((a, d) => a + d.stats.total, 0);
  const taken = days.reduce((a, d) => a + d.stats.taken, 0);
  const fallback = `${PERSON} took ${taken} of ${total} doses this week, about ${Math.round((taken / Math.max(total, 1)) * 100)} percent. A short call around dinner time may help with the evening doses.`;
  summaryBusy = true;
  summary = "";
  render();
  summary = (await aiWeeklyNote(PERSON, days.map((d) => `${d.key}: ${d.stats.taken}/${d.stats.total}`).join("; "))) || fallback;
  summaryBusy = false;
  render();
}

function handleClick(event) {
  const el = event.target.closest("[data-a]");
  if (!el) return;
  const { a, id, v, i } = el.dataset;
  switch (a) {
    case "nav": view = v; focusHeading = true; render(); window.scrollTo({ top: 0, behavior: "smooth" }); break;
    case "take": state.taken[TODAY][id] = nowMinutes(); save(state); render(); toast("Logged. Your family can see it."); break;
    case "untake": delete state.taken[TODAY][id]; save(state); render(); break;
    case "clock": state.demo = v === "" ? null : Number(v); save(state); render(); break;
    case "reset": clearSaved(); location.reload(); break;
    case "sample": Object.assign(rx, { text: SAMPLE_RX, pending: null, warnings: [], err: "" }); render(); break;
    case "read": readPrescription(); break;
    case "rm": rx.pending.splice(Number(i), 1); rx.warnings = localCheck(rx.pending, state.meds); render(); break;
    case "add": addToSchedule(); break;
    case "nudge": toast(`Nudge sent to ${PERSON} (simulated)`); break;
    case "summarise": writeSummary(); break;
    default: break;
  }
}

/* ---------- start up ---------- */

document.addEventListener("click", handleClick);
document.querySelector("[data-a='xl']").addEventListener("click", (e) => {
  const on = document.documentElement.classList.toggle("xl");
  e.currentTarget.setAttribute("aria-pressed", String(on));
});
render();
initAI().then((available) => { if (available) render(); });
