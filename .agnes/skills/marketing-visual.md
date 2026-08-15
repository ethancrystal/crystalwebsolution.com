# Marketing Visual Skill

Use this skill to create procedural 3D visuals and animations for the Crystal Web Solution marketing site.

## When to Use
- New service emblem designs
- Homepage section animations
- Case study visualizations
- Interactive 3D elements
- Particle effects

## Guidelines

### 1. Procedural Only
- No binary image assets unless in `public/` for brand compatibility
- Use Three.js geometry, shaders, and canvas for all visuals
- Document any new `public/` assets with purpose and source

### 2. One Canvas Architecture
- All 3D lives in `components/Scene.jsx`
- Single `<Canvas>` element, multiple actor components
- DOM scrolls over the fixed canvas

### 3. Single RAF Clock
- Hook into `gsap.ticker` via `SmoothScroll.jsx`
- Do NOT start independent animation loops
- Use `useFrame` from React Three Fiber for per-frame updates

### 4. No Allocation in useFrame
- Pre-allocate Three.js objects outside components:
  ```javascript
  const tempVector = new THREE.Vector3();
  const tempColor = new THREE.Color();
  
  useFrame(() => {
    // Mutate in place, don't create new objects
    tempVector.set(x, y, z);
  });
  ```

### 5. Respect prefers-reduced-motion
- Gate all animations:
  ```javascript
  const reduceRef = useRef(false);
  
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceRef.current = mq.matches;
    
    const onChange = (e) => {
      reduceRef.current = e.matches;
    };
    
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  ```

## File Structure

```
components/three/
  Crystal.jsx          # Hero crystal with refraction
  ServiceRail.jsx      # Service signal instruments
  ApproachCompass.jsx  # Process visualization
  Particles.jsx        # Background particles
  BackdropMorph.jsx    # Morphing backdrop
  Sparks.jsx           # Interactive spark effects
  Lights.jsx           # Scene lighting
  Effects.jsx          # Post-processing
  FocusDimmer.jsx      # Readability veil
  CameraRig.jsx        # Camera choreography

lib/
  serviceSignalGeometry.mjs  # Emblem geometry
  flyingCarouselLayout.mjs   # Lab carousel layout
  journey.js                 # Camera stops
  beatProgress.js            # Scroll measurements
```

## Service Emblem Pattern

Each service emblem follows this pattern:
```javascript
// components/three/ServiceEmblem3D.jsx
export default function ServiceEmblem3D({ signal, n }) {
  const meshRef = useRef();
  const glowRef = useRef(0);
  const reduceRef = useRef(false);
  
  useFrame((state, delta) => {
    if (reduceRef.current) return;
    
    // Rotation
    meshRef.current.rotation.y += delta * 0.5;
    
    // Glow animation
    glowRef.current += delta * 0.1;
    meshRef.current.material.emissiveIntensity = 
      0.5 + Math.sin(glowRef.current) * 0.5;
  });
  
  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial 
        color={signalColors[signal]}
        transmission={0.9}
        thickness={2}
      />
    </mesh>
  );
}
```

## Commands

```bash
# Dev server with hot reload
pnpm dev

# Build to verify no errors
pnpm build

# Check for allocation in useFrame
grep -n "new THREE\." components/three/*.jsx
```

## Performance Checklist

- [ ] No `new THREE.*` inside `useFrame`
- [ ] Geometry instanced for particles
- [ ] Textures compressed (KTX2/_basisu) if used
- [ ] Draw calls minimized (merge geometries)
- [ ] Frustum culling enabled
- [ ] Reduced motion respected

## Common Pitfalls

1. **Creating objects in useFrame** — Pre-allocate outside
2. **Forgetting to cleanup** — Return teardown in useEffect
3. **Ignoring reduced motion** — Always check flag
4. **Double canvas creation** — Keep `reactStrictMode: false`
5. **Memory leaks** — Dispose geometries/materials on unmount
