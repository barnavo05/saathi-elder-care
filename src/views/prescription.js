/** Prescription view: paste, read, safety check, add to schedule. */

import { fmt, toMin } from "../schedule.js";
import { bySeverity } from "../rules.js";
import { esc } from "../escape.js";

const TAGS = { high: "Talk to the doctor first", medium: "Worth checking", low: "Note" };

function foundItems(rx) {
  return rx.pending
    .map(
      (p, i) =>
        `<div class="med"><div><b>${esc(p.name)} ${esc(p.dose)}</b><div class="d">${p.times.map((t) => `<span class="pill">${fmt(toMin(t))}</span>`).join("")}${esc(p.instruction)}</div></div><button class="link" data-a="rm" data-i="${i}" aria-label="Remove ${esc(p.name)}">remove</button></div>`
    )
    .join("");
}

function safetyCheck(rx) {
  const spinner = rx.aiBusy ? ' <span class="spin" aria-hidden="true"></span>' : "";
  let html = `<h2 class="mt-lg">3. Safety check${spinner}</h2>`;
  const warnings = [...rx.warnings].sort(bySeverity);
  if (!warnings.length && !rx.aiBusy) html += '<div class="ok-box">No known problems found with the current medicines.</div>';
  for (const w of warnings) {
    html += `<div class="warn ${esc(w.severity)}"><span class="tag">${TAGS[w.severity] || TAGS.low} &middot; ${esc(w.source)}</span><strong>${esc(w.title)}</strong>${esc(w.plain)}</div>`;
  }
  html += `<div class="acts mt-md"><button class="btn" data-a="add"${rx.pending.length ? "" : " disabled"}>Add to schedule</button></div>`;
  return `${html}<p class="hint">Saathi never changes a dose. It flags, and the doctor decides.</p>`;
}

/**
 * @param {{rx: object, ai: {available: boolean, images: boolean}}} data
 */
export function viewPrescription({ rx, ai }) {
  const reading = rx.busy ? '<span class="spin" aria-hidden="true"></span>Reading' : "Read prescription";
  const photo = ai.images
    ? `<label class="btn ghost filebtn">${rx.file ? "Photo added" : "Add a photo"}<input id="rxfile" class="sr-only" type="file" accept="image/*"></label>`
    : "";
  const aiNote = ai.available
    ? `Reads text${ai.images ? " and photos" : ""} with AI.`
    : "AI is not available here, so a built in reader is used.";

  let html = '<div class="view"><p class="chap">02 / 03 &nbsp; NEW PRESCRIPTION</p><h1 tabindex="-1">Paste it.<br><em>We do the rest.</em></h1>';
  html += "<p class=\"sub\">Drop in the doctor's note. Saathi reads it, builds the schedule, and checks it against what is already being taken.</p>";
  html += '<div class="two"><section class="card" aria-labelledby="rx-h"><h2 id="rx-h">1. The prescription</h2>';
  html += `<label for="rxtext" class="sr-only">Prescription text, one medicine per line</label><textarea id="rxtext" class="mt-md" placeholder="One medicine per line, for example:\nTab Warfarin 5 mg, once daily at 6 PM">${esc(rx.text)}</textarea>`;
  html += `<div class="acts"><button class="btn acc" data-a="read"${rx.busy ? " disabled" : ""}>${reading}</button><button class="btn ghost" data-a="sample">Use a sample</button>${photo}</div>`;
  html += `<p class="hint">${aiNote} Not medical advice. Always confirm with the doctor or pharmacist.</p>`;
  if (rx.err) html += `<p class="hint strong" role="alert">${esc(rx.err)}</p>`;
  html += '</section><section class="card" aria-labelledby="found-h" aria-live="polite"><h2 id="found-h">2. What we found</h2>';
  html += rx.pending
    ? foundItems(rx) + safetyCheck(rx)
    : '<p class="hint mt-md">Nothing yet. Try the sample prescription to see the safety check in action.</p>';
  return `${html}</section></div></div>`;
}
