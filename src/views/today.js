/** Today view: what the elder sees. */

import { fmt, dosesFor } from "../schedule.js";
import { PERIODS } from "../config.js";
import { lowSupply, describeSupply } from "../refill.js";
import { esc } from "../escape.js";
import { statusOf, statusLabel } from "./shared.js";

const greeting = (now) => (now < 720 ? "Good morning" : now < 1020 ? "Good afternoon" : "Good evening");

function nextCard(ctx, next) {
  if (!next) {
    return `<section class="good"><h2>All done for today.</h2><p class="sub wide">Every dose is taken. Well done, ${esc(ctx.person)}.</p></section>`;
  }
  const status = statusOf(ctx, next);
  const label = status === "missed" ? "Overdue" : status === "due" ? "Take now" : "Next dose";
  const speak = ctx.canSpeak
    ? `<button class="btn ghost" data-a="speak" data-id="${esc(next.id)}">Read aloud</button>`
    : "";
  return `<section class="next" aria-label="Next dose"><div><p class="lbl">${label} &middot; ${fmt(next.min)}</p><p class="big">${esc(next.med.name)} ${esc(next.med.dose)}</p><p class="note">${esc(next.med.note || "")}</p></div><div class="next-actions">${speak}<button class="btn acc" data-a="take" data-id="${esc(next.id)}" aria-label="Mark ${esc(next.med.name)} as taken">I took it</button></div></section>`;
}

function doseRow(ctx, dose) {
  const status = statusOf(ctx, dose);
  const name = esc(dose.med.name);
  let action;
  if (status === "taken") {
    action = `${statusLabel(ctx, dose)}<button class="link" data-a="untake" data-id="${esc(dose.id)}" aria-label="Undo ${name}">undo</button>`;
  } else if (status === "due") {
    action = `<button class="btn sm" data-a="take" data-id="${esc(dose.id)}" aria-label="Mark ${name} as taken">Mark taken</button>`;
  } else if (status === "missed") {
    action = `${statusLabel(ctx, dose)}<button class="btn sm ghost gap" data-a="take" data-id="${esc(dose.id)}" aria-label="Took ${name} late">Took it late</button>`;
  } else {
    action = '<span class="st up">Later today</span>';
  }
  return `<div class="row"><div class="t">${fmt(dose.min)}</div><div><div class="n">${name} ${esc(dose.med.dose)}</div><div class="d">${esc(dose.med.note || "")}</div></div><div class="act">${action}</div></div>`;
}

function refillCard(low) {
  if (!low.length) return "";
  const items = low.map((x) => `<li>${esc(describeSupply(x))}</li>`).join("");
  return `<section class="refill" aria-label="Refills needed"><h2>Refill soon</h2><ul>${items}</ul></section>`;
}

/** @param {import("../types.js").ViewContext} ctx */
export function viewToday(ctx) {
  const doses = dosesFor(ctx.meds, ctx.today);
  const takenCount = doses.filter((d) => statusOf(ctx, d) === "taken").length;
  const next = doses.find((d) => statusOf(ctx, d) !== "taken");
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  let html = `<div class="view"><p class="chap">01 / 03 &nbsp; TODAY</p><h1 tabindex="-1">${greeting(ctx.now)},<br><em>${esc(ctx.person)}.</em></h1>`;
  html += `<p class="sub">${fmt(ctx.now)} &middot; ${date}. One tap when you have taken a tablet. Your family is kept in the loop.</p>`;
  html += nextCard(ctx, next);
  html += `<div class="prog"><b>${takenCount} of ${doses.length}</b> doses taken today<div class="bar" role="progressbar" aria-label="Doses taken today" aria-valuemin="0" aria-valuemax="${doses.length}" aria-valuenow="${takenCount}"><i data-w="${doses.length ? (takenCount / doses.length) * 100 : 0}"></i></div></div>`;
  html += refillCard(lowSupply(ctx.meds));

  for (const period of PERIODS) {
    const list = doses.filter((d) => d.min >= period.from && d.min < period.to);
    if (!list.length) continue;
    html += `<section class="grp" aria-label="${period.name} doses"><h3>${period.name}</h3>${list.map((d) => doseRow(ctx, d)).join("")}</section>`;
  }
  return `${html}</div>`;
}
