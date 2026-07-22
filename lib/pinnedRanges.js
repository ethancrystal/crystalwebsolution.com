// Scroll-pixel ranges currently owned by a pinned ScrollTrigger. Section snap
// must not fight a pin's own scroll-scrubbed motion, so SmoothScroll checks
// this list before easing toward the nearest section on scroll-idle.
export const pinnedRanges = [];
