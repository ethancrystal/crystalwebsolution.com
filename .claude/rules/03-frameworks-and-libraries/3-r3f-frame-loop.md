---
paths:
  - "components/**/*.jsx"
  - "lib/**/*.{js,mjs}"
---

# R3F Frame Loop

Keeps per-frame work allocation-free and outside React.

## Frame loop

- No allocation inside `useFrame`.
- Pre-allocate vectors at module scope.
- Damp with `1 - Math.exp(-dt * k)`.
- Never start a second RAF loop.
- Hook per-frame work into `gsap.ticker`.

## Cross-boundary state

- Per-frame values live in `lib` singletons.
- Never lift per-frame values into React state.
- DOM talks to canvas via singletons only.

## Teardown

- Every animation effect returns a teardown.
- Respect `motionScale` for reduced motion.

```js
const target = new THREE.Vector3();
useFrame((_, dt) => {
  target.set(0, scrollState.progress, 0);
  mesh.position.lerp(target, 1 - Math.exp(-dt * 6));
});
```
