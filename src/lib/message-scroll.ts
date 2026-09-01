/**
 * Scroll to a message element by id and temporarily highlight it.
 * Expects message DOM nodes to have `data-message-id="<id>"`.
 */
export function scrollToMessage(messageId: string, container?: HTMLElement | null) {
  const el = document.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`);
  if (!el) return false;

  // Scroll into view; prefer container scrolling if provided
  if (container) {
    // Use scrollIntoView within container; fallback to global
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Highlight
  el.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-[18px]");
  // Add a subtle background flash via inline style for better contrast
  const prevTransition = el.style.transition;
  el.style.transition = "background-color 200ms ease";

  // Ensure highlight is visible even on bubbles that don't have ring by default
  el.setAttribute("data-highlighted", "true");

  setTimeout(() => {
    el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded-[18px]");
    el.removeAttribute("data-highlighted");
    el.style.transition = prevTransition;
  }, 1500);

  return true;
}
