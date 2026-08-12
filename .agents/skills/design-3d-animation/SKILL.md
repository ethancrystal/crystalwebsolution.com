---
name: design-3d-animation
description: Design interactive 3D animations and motion scenes using Three.js — animated geometry, particle systems, procedural materials, lighting, camera moves, and orbit-controlled viewers exported as a single self-contained HTML file. Use this whenever the user asks to create a 3D animation, an animated 3D scene, a WebGL/Three.js visualization, a rotating/floating/morphing 3D object, a 3D hero background, a particle field, a 3D product spin, or any "make something 3D that moves" request. Trigger on phrases like "3D animation", "animate this in 3D", "Three.js scene", "WebGL animation", "3D hero", "particle system", "orbiting camera", or "spinning 3D model". Create original scenes rather than copying existing studios' work.
license: MIT — see LICENSE.txt
---

A 3D animation is not a static render — it is a **living scene**: geometry that breathes, materials that catch moving light, and a camera the viewer can hold in their hands. Build every scene as a single self-contained HTML file that runs instantly in a browser or a claude.ai artifact, powered by Three.js.

This happens in two steps:
1. **Motion Concept** — decide what the scene *is* and how it *moves* (a short written brief).
2. **Implementation** — express it as a Three.js scene starting from `templates/viewer.html`.

---

## STEP 1 — MOTION CONCEPT

Before writing code, name the scene and describe its motion in 3–5 sentences. Nail down:

- **Subject**: What is on screen? (single hero object, a field of instances, a morphing surface, a particle cloud, an abstract sculpture)
- **Primary motion**: The signature movement. (slow axial spin, buoyant float on a sine bob, orbital swarm, wave displacement, scroll/mouse-reactive tilt)
- **Secondary motion**: The detail that sells it as crafted. (breathing scale, drifting particles, shimmer on the material, a light that arcs across the surface)
- **Camera**: Static with OrbitControls, a slow auto-orbit, or a scripted dolly. Default to OrbitControls plus a gentle auto-rotate.
- **Mood & palette**: 2–3 colors, background tone, and lighting temperature. Motion reads best against restraint — one hero hue, dark or gradient backdrop.

Keep the concept tight. It is the creative DNA; the code is where craftsmanship happens.

---

## STEP 2 — THREE.JS IMPLEMENTATION

### ⚠️ STEP 0: READ THE TEMPLATE FIRST ⚠️

**Before writing any HTML, Read `templates/viewer.html` using the Read tool.** It is the literal starting point, not inspiration. It already contains the pieces you must not reinvent:

- ES-module `importmap` loading `three` + `OrbitControls` from CDN (no build step)
- Full-window `WebGLRenderer` with `antialias`, correct color space, and DPR clamp
- `PerspectiveCamera`, `OrbitControls` with damping, resize handling
- A `THREE.Clock`-driven `animate()` loop (frame-rate independent via `delta`)
- Ambient + key + rim lighting rig
- A control sidebar wired to live `params` (speed, wireframe, color, auto-rotate, pause, reset)
- Play/Pause, Reset, and Download-frame (PNG) actions

**Keep FIXED:** the render/camera/loop/resize scaffold, the control-sidebar structure and its handlers, the pause/reset/download plumbing.

**Replace VARIABLE:** the scene contents (`buildScene()`), the `params` object, the per-frame `update(delta, elapsed)` body, and which sliders/pickers appear.

### TECHNICAL REQUIREMENTS

**Frame-rate-independent motion** — always drive animation by elapsed/delta time, never by raw frame count:
```javascript
const clock = new THREE.Clock();
function animate() {
  const delta = clock.getDelta();
  const t = clock.getElapsedTime();
  update(delta, t);            // your scene's motion
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

**Performance discipline** (a scene that stutters is not finished):
- Clamp pixel ratio: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`
- Prefer `InstancedMesh` for hundreds/thousands of repeated objects — never a mesh-per-particle in a loop
- Reuse geometries/materials; dispose on rebuild to avoid GPU leaks
- Keep the draw call count low; animate via matrix/attribute updates, not object recreation

**Lighting & material** — motion is only visible when light plays across a surface:
- Use `MeshStandardMaterial`/`MeshPhysicalMaterial` so metalness/roughness react to light
- A three-point rig (ambient fill + directional key + colored rim) gives depth and edge glow
- Consider a subtle `fog` and a gradient/vignette background so the subject sits in space

**Reproducibility** — if the scene uses randomness (particle positions, jitter), seed it so a given configuration is repeatable.

### CRAFTSMANSHIP REQUIREMENTS

Aim for a scene that feels like it came from a top motion studio, refined over many iterations:
- **Easing, not linear** — ramp motion with `sin`/`cos`/smoothstep; avoid robotic constant velocity
- **Layered timing** — combine motions at different frequencies so the loop never feels mechanical
- **Restraint** — one confident hero motion beats five competing ones
- **Depth** — parallax, fog, and rim light to separate subject from background
- **Smoothness** — damped controls, clamped DPR, steady 60fps

### OUTPUT FORMAT

Deliver a **single self-contained HTML artifact** built from `templates/viewer.html`:
- All Three.js loaded via the CDN importmap (no local install, no bundler)
- Scene, params, animation loop, and UI inlined in one file
- Opens directly in any browser and renders as a live interactive artifact in claude.ai

Save it as a `.html` file (and offer to open it). If the user wants variations, expose them through the sidebar params rather than creating multiple files.

---

## SCENE RECIPES (starting points, not a menu — adapt to the concept)

- **Hero object** — one `IcosahedronGeometry`/`TorusKnotGeometry` with physical material, slow multi-axis spin + buoyant bob, rim light arcing across it. Great for landing-page heroes.
- **Particle field** — `Points` with a `BufferGeometry` of a few thousand vertices drifting through a noise/curl flow; additive blending for glow. Or `InstancedMesh` cubes for a structured swarm.
- **Wave surface** — a subdivided `PlaneGeometry` whose vertices are displaced per frame by layered sine waves or noise, shaded by height.
- **Morph / breathe** — lerp between geometries or animate a displacement/param to make a form inhale and exhale.
- **Product spin** — auto-orbit camera around a centered object with a soft studio light rig and ground shadow.

Each recipe is a seed. The Motion Concept decides which to grow and how to make it unique.

---

## RESOURCES

- **templates/viewer.html** — REQUIRED starting point. Read it first (STEP 0). Keep the render/camera/loop/UI scaffold; replace only `buildScene()`, `params`, `update()`, and the parameter controls.
