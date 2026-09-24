# Three.js — Principal Animator Reference

## Table of contents
1. Scene architecture
2. Camera rigs
3. Lighting for the web
4. Materials and shaders (GLSL)
5. Particle systems
6. Post-processing
7. Scroll-driven 3D
8. Performance
9. React Three Fiber (R3F)
10. Patterns from the canon

---

## 1. Scene architecture

Every Three.js project follows this skeleton. Never skip the resize handler or the
animation loop cleanup.

```js
// scene-setup.js — reusable scaffold
import * as THREE from 'three';

export function createScene(canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,           // transparent background — composites over HTML
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2x
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // Resize observer (better than window resize)
  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  });
  ro.observe(canvas);

  // Clock for deltaTime
  const clock = new THREE.Clock();

  // Animation loop
  let frameId;
  function loop() {
    frameId = requestAnimationFrame(loop);
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    // --- update scene here ---
    renderer.render(scene, camera);
  }

  function start() { loop(); }
  function stop() { cancelAnimationFrame(frameId); }
  function dispose() {
    stop();
    ro.disconnect();
    renderer.dispose();
  }

  return { scene, camera, renderer, clock, start, stop, dispose };
}
```

## 2. Camera rigs

**Orbit** — Use `OrbitControls` for exploratory 3D (product viewers, portfolios).
Limit polar angle for grounded scenes: `controls.maxPolarAngle = Math.PI / 2`.

**Fly-through** — Animate camera along a `CatmullRomCurve3` path, look-at target
on a separate spline. Scrub progress from scroll position.

```js
const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 2, 10),
  new THREE.Vector3(5, 3, 5),
  new THREE.Vector3(0, 1, 0),
]);
// In scroll handler:
const t = scrollProgress; // 0–1
camera.position.copy(cameraPath.getPointAt(t));
camera.lookAt(lookAtPath.getPointAt(t));
```

**Parallax mouse** — Subtle camera offset following cursor. Map `mousemove` to
small target offsets, lerp camera position each frame:

```js
const target = { x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
  target.x = (e.clientX / window.innerWidth - 0.5) * 2;
  target.y = (e.clientY / window.innerHeight - 0.5) * -2;
});
// In loop:
camera.position.x += (target.x * 0.5 - camera.position.x) * 0.05;
camera.position.y += (target.y * 0.5 - camera.position.y) * 0.05;
```

## 3. Lighting for the web

Keep it simple — web 3D isn't a Pixar render farm.

- **Environment map** — Use `RGBELoader` + `PMREMGenerator` for realistic reflections. A single HDR environment replaces 4+ lights.
- **Directional + ambient** — Classic two-light setup: one `DirectionalLight` (sun, key), one `AmbientLight` (fill). That's enough for 90% of web 3D.
- **Avoid**: `PointLight` and `SpotLight` with shadows unless absolutely necessary — each shadow-casting light is expensive.

## 4. Materials and shaders (GLSL)

**Standard path:** `MeshStandardMaterial` or `MeshPhysicalMaterial` with environment
maps. Covers 80% of use cases.

**Custom shaders:** When you need distortion, noise, procedural textures, or effects
that don't exist in the standard pipeline.

```glsl
// Vertex shader — wave distortion
uniform float uTime;
uniform float uFrequency;
uniform float uAmplitude;

void main() {
  vec3 pos = position;
  pos.z += sin(pos.x * uFrequency + uTime) * uAmplitude;
  pos.z += sin(pos.y * uFrequency * 0.8 + uTime * 1.2) * uAmplitude * 0.6;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

```glsl
// Fragment shader — gradient with noise
uniform float uTime;
varying vec2 vUv;

// Simplex noise function (include a noise library or inline)
float noise(vec2 st) { /* ... */ }

void main() {
  float n = noise(vUv * 3.0 + uTime * 0.2);
  vec3 color = mix(vec3(0.1, 0.1, 0.3), vec3(0.9, 0.3, 0.5), vUv.y + n * 0.3);
  gl_FragColor = vec4(color, 1.0);
}
```

**ShaderMaterial vs RawShaderMaterial:** Use `ShaderMaterial` (includes Three.js
built-in uniforms like `projectionMatrix`). Use `RawShaderMaterial` only when you
need full control and understand every varying.

## 5. Particle systems

**BufferGeometry + Points** for high particle counts (10k+):

```js
const count = 10000;
const positions = new Float32Array(count * 3);
const randoms = new Float32Array(count);

for (let i = 0; i < count; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 10;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  randoms[i] = Math.random();
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

const material = new THREE.ShaderMaterial({
  vertexShader,    // move particles based on uTime + aRandom
  fragmentShader,  // circular point with soft edge
  uniforms: { uTime: { value: 0 }, uSize: { value: 30.0 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(geometry, material);
```

**GPU particles (advanced):** Use `GPUComputationRenderer` from Three.js examples
for 100k+ particles with physics. Store position + velocity in floating-point
textures, compute next state in a fragment shader.

## 6. Post-processing

Use `EffectComposer` from Three.js examples:

```js
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,   // strength
  0.4,   // radius
  0.85   // threshold
));

// Custom film grain pass
const grainShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uIntensity: { value: 0.05 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float grain = rand(vUv + uTime) * uIntensity;
      gl_FragColor = vec4(color.rgb + grain, color.a);
    }
  `,
};
composer.addPass(new ShaderPass(grainShader));

// In loop: composer.render() instead of renderer.render()
```

**Awwwards-tier post-processing stack:**
1. Render pass
2. Bloom (subtle, `strength: 0.3–0.8`)
3. Chromatic aberration (very subtle, 1–3px offset)
4. Film grain (subtle, `intensity: 0.03–0.08`)
5. Vignette (optional, for cinematic framing)

## 7. Scroll-driven 3D

Combine Lenis (smooth scroll) + GSAP ScrollTrigger + Three.js:

```js
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Map scroll to Three.js uniform
ScrollTrigger.create({
  trigger: '#hero',
  start: 'top top',
  end: 'bottom top',
  scrub: 1,
  onUpdate: (self) => {
    material.uniforms.uProgress.value = self.progress;
    camera.position.z = 5 - self.progress * 3;
  },
});
```

## 8. Performance rules

1. **Cap pixelRatio at 2** — `renderer.setPixelRatio(Math.min(dpr, 2))`
2. **Geometry instancing** — Use `InstancedMesh` for repeated objects (trees, particles, UI elements)
3. **LOD** — `THREE.LOD` for complex scenes with near/far variants
4. **Texture compression** — Use KTX2/Basis Universal via `KTX2Loader`
5. **Dispose everything** — `geometry.dispose()`, `material.dispose()`, `texture.dispose()` on unmount
6. **Frustum culling** — Enabled by default, don't disable it
7. **Draw call budget** — Target <100 draw calls. Use `renderer.info.render.calls` to monitor
8. **Mobile fallback** — Detect via `navigator.maxTouchPoints > 0`, reduce particle count, skip post-processing, lower resolution

## 9. React Three Fiber (R3F)

When the project is React-based, use `@react-three/fiber` + `@react-three/drei`:

```jsx
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Text } from '@react-three/drei';
import { useRef } from 'react';

function FloatingShape() {
  const meshRef = useRef();
  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta * 0.3;
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1, 0.3, 128, 32]} />
        <meshStandardMaterial color="#6366f1" roughness={0.2} metalness={0.8} />
      </mesh>
    </Float>
  );
}

export function HeroScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <Environment preset="city" />
      <FloatingShape />
    </Canvas>
  );
}
```

**Key drei helpers:** `ScrollControls`, `useScroll`, `Float`, `Text`, `Html`,
`ContactShadows`, `Environment`, `useGLTF`, `useTexture`, `MeshTransmissionMaterial`.

## 10. Patterns from the canon

| Pattern | Seen at | Technique |
|---|---|---|
| Scroll-driven camera fly-through | Apple AirPods, Stripe | CatmullRomCurve3 + ScrollTrigger scrub |
| Floating product with environment reflections | Stripe, Linear | R3F + Environment + Float |
| Morphing mesh on scroll | Lusion, HOLOGRAPHIK | Custom vertex shader + uProgress uniform |
| Particle field reacting to cursor | Active Theory, Resn | GPU particles + raycaster mouse position |
| Distortion hover effect on images | Locomotive, Monopo | ShaderMaterial with displacement texture on hover |
| Infinite tunnel / warp speed | Various portfolios | CylinderGeometry + scrolling UV offset |
| Fluid simulation background | Madrepunk | Navier-Stokes on GPU via ping-pong FBOs |
| 3D text with depth | Vercel, Figma Config | `TextGeometry` + `ExtrudeGeometry` or `troika-three-text` |
