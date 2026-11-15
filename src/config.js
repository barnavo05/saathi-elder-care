/** App wide constants. Keeping them here avoids magic numbers in the logic. */

export const PERSON = "Ramesh";

/** Days of supply at or below which a refill warning is shown. */
export const REFILL_WARN_DAYS = 5;

/** Pills assumed for a medicine added from a new prescription. */
export const DEFAULT_SUPPLY = 30;

/** Day parts used to group the schedule. Ranges are minutes since midnight. */
export const PERIODS = [
  { name: "Morning", from: 0, to: 720 },
  { name: "Afternoon", from: 720, to: 1020 },
  { name: "Evening", from: 1020, to: 1260 },
  { name: "Night", from: 1260, to: 1441 },
];

/** Demo clock presets. `null` means the real clock. */
export const CLOCKS = [
  { label: "Live", value: null },
  { label: "8:20 AM", value: 8 * 60 + 20 },
  { label: "2:30 PM", value: 14 * 60 + 30 },
  { label: "9:45 PM", value: 21 * 60 + 45 },
];

export const TABS = [
  { id: "today", label: "Today" },
  { id: "rx", label: "Prescription" },
  { id: "family", label: "Family" },
];

export const SAMPLE_RX = [
  "Dr. A. Menon, General Physician",
  "Patient: Ramesh Sharma, 72 M",
  "1. Tab Warfarin 5 mg, once daily at 6 PM",
  "2. Tab Pantoprazole 40 mg, before breakfast",
  "3. Tab Ibuprofen 400 mg, twice daily after food",
].join("\n");
