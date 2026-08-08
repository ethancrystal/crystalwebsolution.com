import '@testing-library/jest-dom/vitest'

// jsdom lacks ResizeObserver, which @react-three/fiber's <Canvas> requires.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserver;
