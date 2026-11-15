/** Helpers shared by the view modules. Views are pure: data in, HTML string out. */

import { fmt, doseStatus } from "../schedule.js";

/** Status of a dose for today, using the context's clock. */
export const statusOf = (ctx, dose) => doseStatus(dose, ctx.today, ctx.taken, ctx.today, ctx.now);

/** Small status label. Words, not only colour, so it works for everyone. */
export function statusLabel(ctx, dose) {
  const status = statusOf(ctx, dose);
  if (status === "taken") return `<span class="st ok">Taken ${fmt(ctx.taken[ctx.today][dose.id])}</span>`;
  if (status === "missed") return '<span class="st miss">Missed</span>';
  if (status === "due") return '<span class="st due">Due now</span>';
  return '<span class="st up">Later</span>';
}

/** Wrap a view body with the shared footer. */
export const withFooter = (body) =>
  `${body}<footer class="foot">Saathi means companion. Built solo for the Catalyst AI Hackathon 2026. Not a medical device and not medical advice.</footer>`;
