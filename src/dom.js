/** Small DOM helpers shared by the app shell. Not used by the pure view modules. */

export const $ = (selector) => document.querySelector(selector);

/** Show a short status message that screen readers announce (see #toastbox). */
export function toast(message, esc) {
  const box = $("#toastbox");
  box.innerHTML = `<div class="toast">${esc(message)}</div>`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (box.innerHTML = ""), 2800);
}

/** Build a selector that finds the same control after a re-render. */
export function focusSelector(el) {
  if (!el) return null;
  if (el.id) return `#${el.id}`;
  const d = el.dataset || {};
  if (!d.a) return null;
  let selector = `[data-a="${d.a}"]`;
  if (d.id) selector += `[data-id="${CSS.escape(d.id)}"]`;
  if (d.v !== undefined) selector += `[data-v="${CSS.escape(d.v)}"]`;
  return selector;
}

/** Apply sizes through the CSSOM so the strict CSP needs no inline styles. */
export function applySizes(root = document) {
  root.querySelectorAll("[data-w]").forEach((el) => (el.style.width = `${el.dataset.w}%`));
  root.querySelectorAll("[data-h]").forEach((el) => (el.style.height = `${el.dataset.h}px`));
}
