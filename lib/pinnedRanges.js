// Scroll-pixel ranges currently owned by a pinned ScrollTrigger (e.g.
// Showcase's card-reveal belt). Section snap must not fight a pin's own
// scroll-scrubbed motion, so SmoothScroll checks this list before easing
// toward the nearest section on scroll-idle.
export const pinnedRanges = [];
