/** Family view: what a caregiver far away needs to know. */

import { fmt, dosesFor, weekSummary } from "../schedule.js";
import { lowSupply, describeSupply } from "../refill.js";
import { buildDoctorSummary } from "../report.js";
import { esc } from "../text.js";
import { statusOf, statusLabel } from "./shared.js";

function alertBlock(ctx, missed) {
  if (!missed.length) {
    return '<section class="good"><h2>On track today.</h2><p class="sub wide">No missed doses so far.</p></section>';
  }
  const list = missed.map((d) => `${esc(d.med.name)} ${esc(d.med.dose)} at ${fmt(d.min)}`).join(" &middot; ");
  return `<section class="alert" role="alert"><div><h2>${missed.length} missed dose${missed.length > 1 ? "s" : ""} today</h2><p>${list}</p></div><button class="btn acc" data-a="nudge">Nudge ${esc(ctx.person)}</button></section><p class="hint">In production the nudge goes out as an SMS or WhatsApp message. Here it is simulated.</p>`;
}

function chart(week) {
  const label = week.days.map((d) => `${d.label}: ${d.stats.pct === null ? "no data" : `${d.stats.pct} percent`}`).join(", ");
  const bars = week.days
    .map((d, i) => {
      const height = d.stats.pct === null ? 4 : Math.max(4, d.stats.pct * 1.15);
      return `<div class="col${i === week.days.length - 1 ? " today" : ""}" aria-hidden="true"><em>${d.stats.pct === null ? "" : `${d.stats.pct}%`}</em><i data-h="${height}"></i><small>${d.label}</small></div>`;
    })
    .join("");
  return `<section class="card mt-lg" aria-labelledby="week-h"><h2 id="week-h">Last 7 days</h2><div class="chart" role="img" aria-label="Adherence by day. ${esc(label)}">${bars}</div></section>`;
}

function weeklyNote(view) {
  const text = view.summary || "A short plain language summary you can read in ten seconds, or forward to a sibling.";
  const busy = view.summaryBusy ? '<span class="spin" aria-hidden="true"></span>Writing' : "Write this week's note";
  return `<section class="card mt-sm" aria-labelledby="note-h"><h2 id="note-h">Weekly note</h2><p class="sub wide ink" aria-live="polite">${esc(text)}</p><div class="acts"><button class="btn sm" data-a="summarise"${view.summaryBusy ? " disabled" : ""}>${busy}</button></div></section>`;
}

function refillBlock(low) {
  if (!low.length) return "";
  return `<section class="refill mt-sm" aria-label="Refills needed"><h2>Refill soon</h2><ul>${low.map((x) => `<li>${esc(describeSupply(x))}</li>`).join("")}</ul></section>`;
}

function doctorBlock(view) {
  const body = view.doctorText
    ? `<pre class="report" tabindex="0" aria-label="Doctor summary text">${esc(view.doctorText)}</pre><div class="acts"><button class="btn sm ghost" data-a="copy-report">Copy text</button></div>`
    : '<p class="sub wide">A plain text summary of medicines, adherence and refills to share at the next visit.</p>';
  return `<section class="card mt-sm" aria-labelledby="doc-h"><h2 id="doc-h">Doctor summary</h2>${body}<div class="acts"><button class="btn sm" data-a="make-report">Prepare summary</button></div></section>`;
}

/**
 * @param {import("../types.js").ViewContext} ctx
 * @param {{summary:string, summaryBusy:boolean, doctorText:string}} view
 */
export function viewFamily(ctx, view) {
  const doses = dosesFor(ctx.meds, ctx.today);
  const missed = doses.filter((d) => statusOf(ctx, d) === "missed");
  const week = weekSummary(ctx.meds, ctx.taken, ctx.today, ctx.now);
  const low = lowSupply(ctx.meds);

  let html = `<div class="view"><p class="chap">03 / 03 &nbsp; FAMILY VIEW</p><h1 tabindex="-1">How is<br><em>${esc(ctx.person)} doing?</em></h1>`;
  html += '<p class="sub">For the son, daughter or carer who lives far away. Calm when things are fine, loud only when they are not.</p>';
  html += alertBlock(ctx, missed);
  html += `<div class="stats"><div class="stat"><b>${week.avg}%</b><span>taken, last 7 days</span></div><div class="stat"><b>${week.taken}/${week.total}</b><span>doses logged</span></div><div class="stat"><b>${missed.length}</b><span>missed today</span></div></div>`;
  html += chart(week) + refillBlock(low) + weeklyNote(view) + doctorBlock(view);
  html += `<section class="grp" aria-label="Today dose by dose"><h2>Today, dose by dose</h2>${doses.map((d) => `<div class="row"><div class="t">${fmt(d.min)}</div><div><div class="n">${esc(d.med.name)} ${esc(d.med.dose)}</div></div><div class="act">${statusLabel(ctx, d)}</div></div>`).join("")}</section>`;
  return `${html}</div>`;
}

/** Text used by the "Prepare summary" button. */
export function doctorText(ctx) {
  const week = weekSummary(ctx.meds, ctx.taken, ctx.today, ctx.now);
  return buildDoctorSummary(ctx, week, lowSupply(ctx.meds));
}
