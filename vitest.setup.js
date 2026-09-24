import '@testing-library/jest-dom/vitest'

// jsdom lacks ResizeObserver, which @react-three/fiber's <Canvas> requires.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserver;

// jsdom also lacks matchMedia, which every component that gates on
// prefers-reduced-motion calls on mount (ServiceGlyph, ServiceEmblemMark,
// ServiceEmblem3D). Default to "no preference" so animated branches render;
// a test wanting the reduced branch can override window.matchMedia itself.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
}
