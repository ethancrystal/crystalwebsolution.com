# Performance Profile Skill

Use this skill to identify and fix performance issues in CD Sportswear USA.

## When to Use
- Page load feels slow
- Animations stutter
- CRM dashboard lags on large datasets
- Memory leak suspected
- Before production deployment

## Profile Areas

### WebGL/Three.js
- [ ] Draw calls per frame (< 100 target)
- [ ] Geometry instancing for particles
- [ ] Shader complexity (avoid expensive math)
- [ ] Texture sizes (compress with KTX2/_basisu)
- [ ] Frustum culling enabled
- [ ] Geometry disposed on unmount

### React
- [ ] Unnecessary re-renders (React DevTools Profiler)
- [ ] Memoization on expensive components
- [ ] Code splitting on route level
- [ ] useCallback/useMemo deps are stable
- [ ] No object creation in render path

### Supabase
- [ ] RPC function execution time (< 100ms target)
- [ ] RLS policy performance (check query plans)
- [ ] Index coverage on queried columns
- [ ] Realtime connection overhead
- [ ] Query result caching

## Tools

```bash
# React DevTools
# Install: https://react.dev/learn/react-developer-tools

# Three.js Inspector
# Chrome extension: Three.js Inspector

# Supabase Dashboard
# https://supabase.com/dashboard/project/wmnjosiikehsuaqucvja
# → Database → Logs
# → Realtime → Connections

# Lighthouse
npx lighthouse http://localhost:3000 --view
```

## Common Issues & Fixes

### Issue 1: Re-render Storms
**Symptom:** Component re-renders 60x/sec unnecessarily

**Fix:**
```javascript
// Before: Creates new object every render
const [state, setState] = useState({ x: 0, y: 0 });

// After: Use module-level singleton
const scrollState = { progress: 0, velocity: 0, focus: 0 };
// Write to it in useEffect, read in useFrame
```

### Issue 2: Allocation in useFrame
**Symptom:** GC pauses, frame drops

**Fix:**
```javascript
// Before: Allocates new Vector3 every frame
useFrame(() => {
  const pos = new THREE.Vector3();
  mesh.getWorldPosition(pos);
});

// After: Pre-allocate outside component
const tempVector = new THREE.Vector3();

useFrame(() => {
  mesh.getWorldPosition(tempVector);
});
```

### Issue 3: Realtime Channel Churn
**Symptom:** Network thrashing, missed events

**Fix:**
```javascript
// Before: Resubscribes on every parent re-render
const load = useCallback(async () => {
  // ...
}, [projectId, profile]); // profile is new object each time

// After: Depend on stable primitives
const load = useCallback(async () => {
  // ...
}, [projectId, profile?.id, profile?.role]); // stable values
```

### Issue 4: N+1 Queries
**Symptom:** Slow CRM list pages

**Fix:**
```javascript
// Before: One query per project
for (const project of projects) {
  const tasks = await supabase.from('project_tasks').eq('project_id', project.id);
}

// After: Single query with IN clause
const projectIds = projects.map(p => p.id);
const tasks = await supabase.from('project_tasks').in('project_id', projectIds);
```

## Performance Test Commands

```bash
# Development profiling
pnpm dev
# Open Chrome DevTools → Performance tab
# Record 30s of interaction
# Analyze flamechart

# Production build test
pnpm build
pnpm start
npx lighthouse http://localhost:3000 --view

# Database query profiling
# Supabase Dashboard → Database → Logs
# Look for slow queries (> 100ms)
```

## Metrics to Track

| Metric | Target | Tool |
|--------|--------|------|
| Time to First Byte | < 200ms | Lighthouse |
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Total Blocking Time | < 200ms | Lighthouse |
| Draw Calls per Frame | < 100 | Three.js Inspector |
| Frame Time | < 16ms (60fps) | Chrome DevTools |
| RPC Execution Time | < 100ms | Supabase Logs |
| Realtime Latency | < 500ms | Supabase Dashboard |

## Output Format

Return a markdown report:
```markdown
# Performance Profile Report

**Date:** [current date]
**Environment:** [dev/prod]
**Profile Duration:** [X seconds]

## Summary
- Lighthouse Score: X/100
- FPS Average: X
- Draw Calls Average: X
- Slowest RPC: [function] ([X]ms)

## Findings

### Critical
| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | Allocation in useFrame | Frame drops | Pre-allocate |

### Warnings
[same format]

## Recommendations
1. [immediate fix]
2. [short-term improvement]
3. [long-term optimization]
```
