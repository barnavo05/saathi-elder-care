/** Small pure text helpers. */

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape text for safe use inside HTML content and double quoted attributes. */
export const esc = (value) =>
  String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** Upper case the first letter. Empty input is returned unchanged. */
export const capitalise = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
