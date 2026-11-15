/**
 * Prescription parsing helpers. Used both to clean AI output and as the
 * offline fallback reader, so the app works without any AI service.
 */

import { pad } from "./schedule.js";
import { capitalise } from "./text.js";

/** Pull the first JSON array out of a model reply, even inside code fences. */
export function extractJSON(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("No JSON array found");
  return JSON.parse(text.slice(start, end + 1));
}

/** Validate and tidy items from any source. Bad times fall back to 08:00. */
export function normItems(list) {
  return (Array.isArray(list) ? list : [])
    .filter((x) => x && x.name)
    .map((x) => {
      let times = Array.isArray(x.times)
        ? x.times
            .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
            .map((t) => `${pad(Number(t.split(":")[0]))}:${t.split(":")[1]}`)
        : [];
      if (!times.length) times = ["08:00"];
      return {
        name: capitalise(String(x.name).trim()),
        dose: String(x.dose || "").trim(),
        times,
        instruction: String(x.instruction || "").trim(),
      };
    });
}

const MED_LINE = /\b(tab|tablet|cap|capsule|syp|syrup|inj)\b|\d\s?(mg|mcg|ml)\b/i;

/** Pick dose times from the wording of one prescription line. */
function timesFromLine(line) {
  const explicit = line.match(/(\d{1,2})(?::(\d{2}))?\s?(am|pm)/i);
  if (explicit) {
    let h = Number(explicit[1]) % 12;
    if (/pm/i.test(explicit[3])) h += 12;
    return [`${pad(h)}:${explicit[2] || "00"}`];
  }
  if (/thrice|\btds\b|three times|\b3\s?x/i.test(line)) return ["08:00", "14:00", "20:00"];
  if (/twice|\bbd\b|\bbid\b|two times|\b2\s?x/i.test(line)) return ["08:00", "20:00"];
  if (/night|\bhs\b|bedtime/i.test(line)) return ["21:00"];
  if (/evening/i.test(line)) return ["18:00"];
  if (/before breakfast/i.test(line)) return ["07:30"];
  return ["08:00"];
}

/** Offline reader: one medicine per line or per semicolon. */
export function localParse(text) {
  return String(text || "")
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter((l) => MED_LINE.test(l))
    .map((line) => {
      const clean = line.replace(/^\d+[.)]\s*/, "");
      const name =
        clean.match(/(?:tab(?:let)?|cap(?:sule)?|syp|syrup|inj)\.?\s+([A-Za-z][A-Za-z-]+)/i) ||
        clean.match(/^([A-Za-z][A-Za-z-]+)/);
      if (!name) return null;
      const dose = (clean.match(/\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml)\b/i) || [""])[0];
      const instruction = (
        clean.match(/(?:after|before|with)\s+(?:food|meals?|breakfast|lunch|dinner)|at night/i) || [""]
      )[0];
      return { name: name[1], dose, times: timesFromLine(clean), instruction };
    })
    .filter(Boolean);
}

/** Limits for what a user can submit, to keep requests small and predictable. */
export const MAX_TEXT_LENGTH = 5000;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Check prescription input before it is parsed or sent to the AI.
 * @param {string} text
 * @param {{type?: string, size?: number}|null} file
 * @returns {string|null} A message for the user, or null when the input is fine.
 */
export function validateRxInput(text, file) {
  if (!String(text || "").trim() && !file) return "Paste the prescription text or add a photo first.";
  if (String(text || "").length > MAX_TEXT_LENGTH) return `That is too long. Keep it under ${MAX_TEXT_LENGTH} characters.`;
  if (file && !/^image\//.test(file.type || "")) return "Please choose an image file.";
  if (file && file.size > MAX_IMAGE_BYTES) return "That photo is too large. Choose one under 5 MB.";
  return null;
}
