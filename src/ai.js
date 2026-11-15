/**
 * Optional AI layer. It lights up only when the page is opened inside Claude,
 * where `window.claude.use("sample")` is provided. Everywhere else every
 * function here returns null and the app falls back to local rules.
 * No API keys exist in this code base.
 */

import { extractJSON, normItems } from "./parser.js";

let sample = null;
let supportsImages = false;

/** Resolve the AI capability once at start up. Never throws. */
export async function initAI() {
  try {
    if (window.claude && window.claude.use) {
      const s = await window.claude.use("sample");
      if (s) {
        sample = s;
        try {
          const limits = await s.limits();
          supportsImages = Boolean(limits && limits.images);
        } catch {
          supportsImages = false;
        }
      }
    }
  } catch {
    sample = null;
  }
  return aiAvailable();
}

export const aiAvailable = () => sample !== null;
export const aiImages = () => supportsImages;

const describeMeds = (list) =>
  list.map((m) => `${m.name} ${m.dose} at ${m.times.join(",")}`).join("; ");

/** Read a prescription (text and optional photo). Returns items or null. */
export async function aiParse(text, file) {
  if (!sample) return null;
  const prompt =
    "You read medical prescriptions for an elderly patient's family. Extract every medicine. " +
    'Return ONLY a JSON array, no prose. Each item: {"name":string,"dose":string,"times":["HH:MM" 24h],"instruction":string}. ' +
    "Map once daily to 08:00, twice daily to 08:00 and 20:00, three times to 08:00, 14:00, 20:00, " +
    "at night to 21:00, before breakfast to 07:30. If an explicit time is written, use it.\n\n" +
    `Prescription text (may be empty if an image is attached):\n${text}`;
  try {
    const options = { cache: false };
    if (file && supportsImages) options.images = [file];
    const reply = await sample(prompt, options);
    const items = normItems(extractJSON(reply.text));
    return items.length ? items : null;
  } catch {
    return null;
  }
}

/** Ask for additional interaction warnings. Returns [] when unavailable. */
export async function aiReview(existingMeds, newItems) {
  if (!sample) return [];
  const prompt =
    `A 72 year old patient already takes: ${describeMeds(existingMeds)}.\n` +
    `A new prescription adds: ${describeMeds(newItems)}.\n` +
    "List real, clinically recognised interactions or serious timing problems. Return ONLY a JSON array (max 3) of " +
    '{"severity":"high"|"medium"|"low","title":string,"plain":string (one or two plain sentences, no dashes),"drugs":[string,string]}. ' +
    "Return [] if nothing important. Do not invent interactions.";
  try {
    const reply = await sample(prompt, { cache: false });
    return extractJSON(reply.text)
      .slice(0, 3)
      .filter((a) => a && a.title && a.plain)
      .map((a) => ({
        severity: ["high", "medium", "low"].includes(a.severity) ? a.severity : "medium",
        title: String(a.title),
        plain: String(a.plain),
        source: "AI review",
        drugs: (a.drugs || []).map((d) => String(d).toLowerCase()),
      }));
  } catch {
    return [];
  }
}

/** Two sentence weekly note for the family. Returns null when unavailable. */
export async function aiWeeklyNote(person, dayLines) {
  if (!sample) return null;
  try {
    const reply = await sample(
      `Write exactly two short, warm sentences for a family caregiver about ${person} (72) and this week's ` +
        "medication adherence. Plain language, no dashes, no medical advice, no emojis. Mention one practical " +
        `suggestion. Data (date: taken/scheduled): ${dayLines}`,
      { cache: false }
    );
    return reply.text.trim();
  } catch {
    return null;
  }
}
