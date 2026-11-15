# Saathi

A medication companion for elders and their families. Built solo for the CATALYST Solo AI Hackathon 2026 (MnM x PromptWars).

**Challenge:** Elderly Care & Medication Management Platform

**Live demo:** https://barnavo05.github.io/saathi-elder-care/

Missing one dose is easy. Noticing it from another city is hard. Saathi gives the elder one big screen and one tap, and gives the family a quiet dashboard that gets loud only when a dose is missed.

## How it answers the challenge

| Need in elder care and medication management | What Saathi does |
| --- | --- |
| Take the right medicine at the right time | Today view with a next dose card, due and overdue states, one tap logging, undo and late logging |
| Understand new prescriptions | Paste a prescription (or add a photo with AI) and it becomes a daily schedule |
| Avoid dangerous combinations | Safety check flags interactions and duplicates in plain language. It never changes a dose |
| Never run out | Refill tracker counts pills used and warns when about 5 days of supply remain |
| Elders with poor eyesight or low literacy | Large text toggle, one primary action per screen, and a Read aloud button for the next dose |
| Keep family informed | Missed dose alert, simulated nudge, 7 day adherence chart, AI written weekly note |
| Work with doctors | One click Doctor summary: medicines, adherence, missed doses and refills as plain text |

## Run it

The app uses ES modules, so serve it over http instead of opening the file directly.

```bash
npm start        # serves on http://localhost:8080
npm run check    # lint, type check and all tests (Node 18 or newer)
```

Then open the Prescription tab, click "Use a sample", then "Read prescription". Use the Demo clock bar at the bottom to jump to 2:30 PM and see missed dose alerts.

## Project structure

```
index.html            Page shell, skip link, landmarks, Content Security Policy
styles.css            Design tokens, layout, focus styles, reduced motion
src/
  config.js           Constants (periods, clock presets, refill threshold)
  types.js            JSDoc type definitions (Medicine, Dose, ViewContext, ...)
  schedule.js         Time, dose status and adherence logic (pure)
  rules.js            Offline drug interaction rules and duplicate check (pure)
  parser.js           Prescription parsing and AI output cleanup (pure)
  refill.js           Supply tracking and low stock detection (pure)
  report.js           Doctor summary text (pure)
  text.js             HTML escaping and text helpers (pure)
  store.js            localStorage persistence and demo data
  ai.js               Optional AI layer, returns null when unavailable
  speech.js           Read aloud through the browser speech API
  dom.js              Small DOM helpers (toast, focus, sizes)
  views/              Pure view functions: data in, HTML string out
    today.js  prescription.js  family.js  shared.js
  app.js              App shell: state, event table, rendering
tests/                64 unit tests using the built in node:test runner
.github/workflows/    CI runs lint and tests on every push
```

Design rule: everything that makes a decision (scheduling, interactions, parsing, refills, report text) and every view is a pure function with no DOM access. The only files that touch the DOM are `app.js` and `dom.js`.

## Testing

64 unit tests (about 99 percent line coverage of the logic and view modules) cover:
- dose status transitions, time formatting and adherence maths
- interaction rules, including case insensitivity, duplicates and false positives
- the prescription parser (abbreviations such as BD and TDS, explicit AM and PM times, malformed input, AI replies wrapped in code fences)
- refill maths (never below zero, untracked medicines ignored)
- doctor summary text
- input validation, local storage recovery (corrupt or blocked storage), the AI layer with a fake provider, and read aloud
- the rendered views, including that malicious medicine names are escaped and that alerts, progress bars and chart text alternatives are present

```bash
npm test
```

`npm run lint` runs ESLint and `npm run typecheck` runs the TypeScript compiler over the JSDoc types. `npm run coverage` prints coverage. CI runs lint, type check and tests on every push.

## Security and privacy

- Strict Content Security Policy: scripts only from this site, no inline scripts, no inline styles, and `connect-src` limited to this site. Referrer is not sent.
- All dynamic text is HTML escaped before rendering, and tests check this.
- No API keys exist anywhere in the code base.
- Medication data stays in the browser (localStorage). Nothing is sent to a server by the app itself.
- Prescription input is validated (length, file type, file size) before it is parsed or sent to the AI.
- Storage, speech and AI calls are wrapped so a failure never breaks the app.

## Accessibility

- Semantic landmarks (header, nav, main), a skip link, and one h1 per view.
- Every control is a real button or label, reachable by keyboard, with visible focus rings.
- Focus moves to the page heading when the view changes, and returns to the same control after actions.
- Live regions announce toasts, safety results and the weekly note. The progress bar uses `role="progressbar"`. The chart has a text alternative.
- Touch targets are at least 44 pixels. Text contrast meets WCAG AA. Status is shown in words, not only colour.
- Larger text toggle, Read aloud for the next dose, and `prefers-reduced-motion` is respected.
- Audited with axe-core (WCAG 2.2 AA and best practices) on every screen at desktop and mobile size and in large text mode, with zero violations. Fully usable with the keyboard alone.

## AI

When the page is opened inside Claude, the AI layer reads prescriptions (text and photos), adds extra interaction warnings, and writes the weekly family note. Everywhere else, including GitHub Pages, it falls back to the local reader and the local rules, so the full flow still works. See `src/ai.js`.

## Limitations

- The interaction list is small and illustrative. It is not a clinical database.
- The nudge to the elder is simulated. A production version would send SMS or WhatsApp messages from a backend.
- Data is per browser. Syncing between the elder's phone and the family's phone would need a backend.
- Pill counts assume one pill per dose.

Not a medical device and not medical advice. Always confirm with a doctor or pharmacist.

## License

MIT
