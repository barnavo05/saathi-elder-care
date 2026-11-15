import { capitalise } from "./text.js";

/**
 * Offline drug interaction rules. These always run, even when AI is unavailable.
 * This is a small illustrative list, not a clinical database.
 */

export const RULES = [
  {
    a: ["warfarin"],
    b: ["aspirin"],
    severity: "high",
    title: "Warfarin with aspirin",
    plain:
      "Both thin the blood. Together they raise the chance of serious bleeding. Please check with the doctor before starting.",
  },
  {
    a: ["warfarin"],
    b: ["ibuprofen", "diclofenac", "naproxen"],
    severity: "high",
    title: "Warfarin with an anti-inflammatory painkiller",
    plain:
      "These painkillers can cause stomach bleeding and make warfarin stronger. Ask the doctor about a safer option such as paracetamol.",
  },
  {
    a: ["aspirin"],
    b: ["ibuprofen", "naproxen", "diclofenac"],
    severity: "medium",
    title: "Aspirin with another painkiller",
    plain:
      "Taking these together can irritate the stomach and may weaken aspirin's heart protection.",
  },
  {
    a: ["amlodipine"],
    b: ["simvastatin"],
    severity: "medium",
    title: "Amlodipine with simvastatin",
    plain:
      "This pair can raise the statin level in the blood. The dose usually needs a limit.",
  },
  {
    a: ["clopidogrel"],
    b: ["omeprazole", "esomeprazole"],
    severity: "medium",
    title: "Clopidogrel with omeprazole",
    plain:
      "Omeprazole can make clopidogrel work less well. Pantoprazole is often preferred.",
  },
  {
    a: ["lisinopril", "enalapril", "ramipril"],
    b: ["potassium"],
    severity: "medium",
    title: "BP tablet with potassium",
    plain:
      "Together they can push potassium too high, which affects the heart rhythm.",
  },
];

const matches = (name, terms) => terms.some((t) => name.includes(t));

/**
 * Check new prescription items against the current medicines and each other.
 * A pair is only reported when at least one of the two drugs is new.
 * @returns {Array<{severity,title,plain,source,pair}>}
 */
export function localCheck(newItems, existingMeds) {
  const existing = existingMeds.map((m) => ({ name: m.name.toLowerCase(), isNew: false }));
  const added = newItems.map((i) => ({ name: i.name.toLowerCase(), isNew: true }));
  const all = [...existing, ...added];
  const out = [];

  for (const rule of RULES) {
    for (const x of all) {
      for (const y of all) {
        if (x === y || !(x.isNew || y.isNew)) continue;
        if (matches(x.name, rule.a) && matches(y.name, rule.b)) {
          if (!out.some((o) => o.title === rule.title)) {
            out.push({
              severity: rule.severity,
              title: rule.title,
              plain: rule.plain,
              source: "Known interaction",
              pair: [x.name, y.name],
            });
          }
        }
      }
    }
  }

  for (const x of added) {
    if (existing.some((e) => e.name === x.name)) {
      out.push({
        severity: "low",
        title: `${capitalise(x.name)} is already on the schedule`,
        plain: "Adding it again would double the dose. Check whether this replaces the old one.",
        source: "Duplicate check",
        pair: [x.name],
      });
    }
  }
  return out;
}

const ORDER = { high: 0, medium: 1, low: 2 };
export const bySeverity = (a, b) => ORDER[a.severity] - ORDER[b.severity];
