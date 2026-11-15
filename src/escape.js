const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape text for safe use inside HTML content and double quoted attributes. */
export const esc = (value) =>
  String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ENTITIES[c]);
