# Saathi

A medication companion for elders and their families. Built solo for the CATALYST Solo AI Hackathon 2026 (MnM x PromptWars).

**Challenge:** Elderly Care & Medication Management Platform

**Live demo:** https://barnavo05.github.io/saathi-elder-care/

Missing one dose is easy. Noticing it from another city is hard. Saathi gives the elder one big screen and one tap, and gives the family a quiet dashboard that gets loud only when a dose is missed.

## Features

| Area | What it does |
| --- | --- |
| Today | Large text, a "next dose" card, one tap to mark a dose taken, undo, and late logging. |
| Prescription | Paste a prescription and it becomes a schedule. AI reads it when available, with a built in reader as fallback. |
| Safety check | Flags risky combinations (for example warfarin with aspirin) and duplicates in plain language. It never changes a dose. |
| Family | Missed dose alert, simulated nudge, 7 day adherence chart, and an AI written weekly note. |
| Demo clock | Jump between morning, afternoon and night to see missed dose alerts without waiting. |

## Run it

The app uses ES modules, so serve it over http instead of opening the file directly.

```bash
npm start        # serves on http://localhost:8080
npm test         # runs the unit tests (Node 18 or newer, no dependencies)
```

Then open the Prescription tab, click "Use a sample", then "Read prescription".

## Project structure

```
index.html          Page shell, skip link, landmarks, Content Security Policy
styles.css          Design tokens, layout, focus styles, reduced motion
src/
  schedule.js       Pure time and dose status logic (no DOM)
  rules.js          Offline drug interaction rules and duplicate check (no DOM)
  parser.js         Prescription parsing and AI output cleanup (no DOM)
  store.js          localStorage persistence and demo data
  ai.js             Optional AI layer, returns null when unavailable
  app.js            Views, events and rendering
tests/              Unit tests using the built in node:test runner
.github/workflows/  CI that runs the tests on every push
```

The logic that matters (scheduling, interaction rules, parsing) lives in pure modules with no DOM access, which is why it can be tested directly.

## Testing

27 unit tests cover dose status transitions, time formatting, adherence maths, interaction rules (including case insensitivity, duplicates and false positives), and the prescription parser (abbreviations such as BD and TDS, explicit AM and PM times, malformed input, and AI replies wrapped in code fences). They run with `npm test` and in GitHub Actions on every push.

## Security and privacy

- Strict Content Security Policy: scripts only from this site, no inline scripts, no inline styles, no network connections from the page.
- All dynamic text is HTML escaped before rendering.
- No API keys exist anywhere in the code base.
- Medication data stays in the browser (localStorage). Nothing is sent to a server by the app itself.
- Storage and AI calls are wrapped so a failure never breaks the app.

## Accessibility

- Semantic landmarks (header, nav, main), a skip link, and one h1 per view.
- Every control is a real button or label, reachable by keyboard, with visible focus rings.
- Focus moves to the page heading when the view changes, and returns to the same control after actions.
- Live regions announce toasts, safety results and the weekly note. The progress bar uses `role="progressbar"`. The chart has a text alternative.
- Touch targets are at least 44 pixels. Text contrast meets WCAG AA. Status is shown in words, not only colour.
- Larger text toggle for elders, and `prefers-reduced-motion` is respected.

## AI

When the page is opened inside Claude, the AI layer reads prescriptions (text and photos), adds extra interaction warnings, and writes the weekly family note. Everywhere else, including GitHub Pages, it falls back to the local reader and the local rules, so the full flow still works. See `src/ai.js`.

## Limitations

- The interaction list is small and illustrative. It is not a clinical database.
- The nudge to the elder is simulated. A production version would send SMS or WhatsApp messages from a backend.
- Data is per browser. Syncing between the elder's phone and the family's phone would need a backend.

Not a medical device and not medical advice. Always confirm with a doctor or pharmacist.

## License

MIT
