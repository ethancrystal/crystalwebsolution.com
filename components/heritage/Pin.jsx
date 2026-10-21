// Anchors for the scroll-drawn thread (ThreadRail). Pins are inert, empty
// elements: ThreadRail reads their layout position (offset chain, so reveal
// transforms never skew it) and routes the thread through them in DOM order.

// A point the thread passes through. `lane` snaps it to the left/right gutter;
// `cross` ('rl' or 'lr') draws an S-curve from one gutter to the other around
// this height; with neither, the thread goes through the pin's own position.
export function Pin({ lane, cross, top, bottom, left }) {
  return (
    <i
      aria-hidden="true"
      className="hx-pin"
      data-pin=""
      data-lane={lane}
      data-cross={cross}
      style={{ top, bottom, left }}
    />
  );
}

// A pin with a visible bead the thread lights up as it passes. Sits on the
// content edge of the right or left gutter.
export function Checkpoint({ side = 'right', top, children }) {
  // Same lanes as ThreadRail's: the right one stops 44px short of the edge so it
  // clears the fixed JourneyNav.
  const left = side === 'right'
    ? 'calc(min(97.5%, calc(50% + 690px)) - 44px)'
    : 'max(2.5%, calc(50% - 690px))';
  return (
    <div
      aria-hidden="true"
      className="hx-checkpoint"
      data-pin=""
      data-checkpoint=""
      style={{ left, marginLeft: -5, top }}
    >
      <span className="hx-checkpoint-dot" />
      {children}
    </div>
  );
}
