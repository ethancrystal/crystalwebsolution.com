// Shared onMouseMove handler for the radial cursor-glow used on the Approach
// and Stories cards. Writes directly to the event's own currentTarget rather
// than a ref from a custom hook, so it's safe to pass to every card inside a
// .map() without violating the Rules of Hooks (no hook is called per item).
export function onCardMouseGlow(event) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
  card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
}
