# Saathi

A medication companion for elders and their families. Built solo for the CATALYST Solo AI Hackathon 2026 (MnM x PromptWars).

**Problem:** Elderly Care & Medication Management Platform.

Missing one dose is easy. Noticing it from another city is hard. Saathi gives the elder one big screen and one tap, and gives the family a quiet dashboard that gets loud only when a dose is missed.

## Features
- **Today view:** large text, next dose card, one tap to mark a dose taken, undo, and late logging.
- **Prescription reader:** paste a prescription and it becomes a schedule. Uses AI when available, with a built in reader as fallback.
- **Safety check:** flags risky combinations (for example warfarin with aspirin) and duplicate medicines in plain language. It never changes a dose, the doctor decides.
- **Family view:** missed dose alert, nudge button (simulated), 7 day adherence chart, and an AI written weekly note.
- **Demo clock:** jump between morning, afternoon and night to see missed dose alerts without waiting.
- **Larger text toggle** for elders.

## Tech
Single file app: HTML, CSS and vanilla JavaScript. Data is stored in the browser with localStorage. AI features use Claude when opened inside Claude, and fall back to local rules elsewhere.

## Try it
Open `index.html`, or use the live demo. Click "Prescription", then "Use a sample", then "Read prescription".

Not a medical device and not medical advice.
