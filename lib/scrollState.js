// Per-frame scroll state. Written by SmoothScroll (Lenis tick),
// read every frame by CameraRig, Particles, Marquee, etc.
// Never lift this into React state — it changes dozens of times a second.
//
// focus: 0..1 "text owns the viewport" signal, written by FocusVeil's
// ScrollTriggers and read every frame by FocusDimmer to damp the scene's
// exposure. 3D consumers should damp toward it, never treat it as a switch.
export const scrollState = { progress: 0, velocity: 0, focus: 0 };
