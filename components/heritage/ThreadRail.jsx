'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sectionTop } from '../../lib/beatProgress';
import { THREAD_COLORS } from '../../lib/heritage.mjs';

gsap.registerPlugin(ScrollTrigger);

// The Heritage Thread: one multi-strand thread that is sewn down the production
// story as the visitor scrolls, passing through the <Pin>s and <Checkpoint>s
// the sections place.
//
// - One viewport-sized canvas, drawn only for the stretch of thread on screen.
//   A tall SVG of the whole route repainted on every scroll frame was far too
//   slow, so nothing here scales with page length. No second
//   requestAnimationFrame loop: the needle eases on the shared gsap.ticker (the
//   clock Lenis rides), and scroll-driven redraws come from a ScrollTrigger,
//   which SmoothScroll updates right after Lenis has written the new scroll
//   position. The ticker alone would run before Lenis (child effects register
//   first) and draw the thread one frame behind the page.
// - The canvas is position:fixed inside a clip-path:inset(0) wrapper, so it
//   shows only while the world is on screen and sits between the world's ground
//   and its content (z-index 1 vs 2).
// - Positions are read with the offset chain, never getBoundingClientRect, so
//   reveal transforms cannot skew the route (see lib/beatProgress.sectionTop).
// - Phones and tablets under 900px get no thread (CSS hides it, measure skips).
// - Reduced motion: the whole thread is drawn, nothing eases.

const [C1, C2, C3, C4] = THREAD_COLORS;

// One entry per strand, back to front: [colour, alpha, width, cap, dash, dash
// offset, dx, dy]. Dark underlay and shadow, the plied body, the twist, then a
// light highlight; the dashed ones are what read as twisted fibre.
const STRANDS = [
  ['#000', 0.22, 13, 'round', null, 0, 3, 7],
  ['#000', 0.3, 9, 'round', null, 0, 2, 5],
  [C2, 0.1, 12, 'round', [0.6, 2.4], 0, 0, 0],
  [C3, 0.12, 9.5, 'round', [0.5, 3.2], -1.4, 0, 0],
  [C1, 1, 8, 'round', null, 0, 0, 0],
  [C2, 1, 6, 'round', null, 0, -0.6, -0.9],
  [C1, 0.85, 7.2, 'butt', [3.2, 4.4], 0, 0, 0],
  [C3, 1, 3.4, 'round', [3.2, 4.4], -3.8, -1.2, -1.6],
  [C4, 0.9, 1.4, 'round', [2, 5.6], -4.4, -1.9, -2.4],
  [C4, 0.35, 0.8, 'round', null, 0, -2.6, -3],
  ['#000', 0.35, 1.2, 'round', null, 0, 2.6, 3.1],
];

// Width the right-hand lane keeps clear of the viewport edge, in px.
const NAV_CLEAR = 44;

// Samples of the route are [length, running max y, x, y]; the running max
// makes "how far down the thread has the needle got" a plain binary search.
const LEN = 0;
const MAXY = 1;
const X = 2;
const Y = 3;

// Layout position of el inside root, summing the offset chain.
function positionIn(el, root) {
  let x = 0;
  let y = 0;
  for (let node = el; node && node !== root; node = node.offsetParent) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

// First index whose sample satisfies test (samples are ascending in MAXY and
// LEN); the last index when none does.
function firstWhere(samples, test) {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (test(samples[mid])) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

// Reads the world's pins and turns them into one smooth route: a sampled
// polyline (about 12px apart) and the checkpoints to light along the way.
function buildThread(world) {
  const W = world.offsetWidth;
  const left = Math.max(W * 0.025, W / 2 - 690);
  // Kept NAV_CLEAR short of the edge so the thread does not run under the fixed
  // JourneyNav numerals. Checkpoint (Pin.jsx) applies the same offset in CSS.
  const right = Math.min(W * 0.975, W / 2 + 690) - NAV_CLEAR;

  const raw = []; // [x, y, isCrossing]
  const marks = [];
  world.querySelectorAll('[data-pin]').forEach((pin) => {
    const isCheckpoint = pin.hasAttribute('data-checkpoint');
    const bead = isCheckpoint ? pin.firstElementChild || pin : pin;
    const at = positionIn(bead, world);
    const x = at.x + bead.offsetWidth / 2;
    const y = at.y + bead.offsetHeight / 2;
    if (isCheckpoint) marks.push({ el: bead, y, on: null });

    const cross = pin.dataset.cross;
    if (cross) {
      const from = cross === 'rl' ? right : left;
      const to = cross === 'rl' ? left : right;
      const dir = cross === 'rl' ? -1 : 1;
      const q = Math.min(120, Math.abs(to - from) * 0.12);
      raw.push([from, y - 64, 1], [from + dir * q, y - 8, 1], [to - dir * q, y + 8, 1], [to, y + 64, 1]);
      return;
    }
    if (pin.dataset.lane) {
      raw.push([pin.dataset.lane === 'r' ? right : left, y, 0]);
      return;
    }
    raw.push([x, y, 0]);
  });
  if (raw.length < 2) return null;

  // Long runs get a slight sideways sag so the thread never looks ruled.
  const pts = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1];
    const b = raw[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len > 320 && !a[2] && !b[2]) {
      const nx = -dy / len;
      const ny = dx / len;
      const mx = a[0] + dx * 0.5;
      let sag = Math.min(Math.abs(dx) < 160 ? 8 : 16, len * 0.03);
      sag *= Math.abs(dx) < 160 ? ((nx >= 0) === (mx > W / 2) ? 1 : -1) : i % 2 ? 1 : -1;
      pts.push([Math.min(W - 8, Math.max(8, mx + nx * sag)), a[1] + dy * 0.5 + ny * sag, 0]);
    }
    pts.push(b);
  }

  // Cubic Bezier through the points with chord-length-weighted tangents (an
  // unkinked Catmull-Rom), flattened as it is walked.
  const chord = (a, b) => Math.sqrt(Math.max(1e-3, Math.hypot(b[0] - a[0], b[1] - a[1])));
  const samples = [[0, pts[0][1], pts[0][0], pts[0][1]]];
  let length = 0;
  let maxY = pts[0][1];
  let lastX = pts[0][0];
  let lastY = pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const d1 = chord(p0, p1);
    const d2 = chord(p1, p2);
    const d3 = chord(p2, p3);
    const d1s = d1 * d1;
    const d2s = d2 * d2;
    const d3s = d3 * d3;
    const c1x = (d1s * p2[0] - d2s * p0[0] + (2 * d1s + 3 * d1 * d2 + d2s) * p1[0]) / (3 * d1 * (d1 + d2));
    const c1y = (d1s * p2[1] - d2s * p0[1] + (2 * d1s + 3 * d1 * d2 + d2s) * p1[1]) / (3 * d1 * (d1 + d2));
    const c2x = (d3s * p1[0] - d2s * p3[0] + (2 * d3s + 3 * d3 * d2 + d2s) * p2[0]) / (3 * d3 * (d3 + d2));
    const c2y = (d3s * p1[1] - d2s * p3[1] + (2 * d3s + 3 * d3 * d2 + d2s) * p2[1]) / (3 * d3 * (d3 + d2));

    const steps = Math.max(4, Math.min(80, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 12)));
    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * u * u * t;
      const c = 3 * u * t * t;
      const e = t * t * t;
      const x = a * p1[0] + b * c1x + c * c2x + e * p2[0];
      const y = a * p1[1] + b * c1y + c * c2y + e * p2[1];
      length += Math.hypot(x - lastX, y - lastY);
      lastX = x;
      lastY = y;
      maxY = Math.max(maxY, y);
      samples.push([length, maxY, x, y]);
    }
  }
  return { samples, marks };
}

export default function ThreadRail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const world = canvas?.closest('.hx-world');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !world || !ctx) return undefined;

    const wide = window.matchMedia('(min-width: 900px)');
    // Live, like SmoothScroll's: a visitor can switch the preference while the
    // page is open, so `reduced` is re-read from the query on every change.
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motion.matches;

    let samples = [];
    let marks = [];
    let height = 0;
    let worldTop = 0;
    let current = 0;
    let drawnCurrent = NaN;
    let drawnScroll = NaN;
    let fitW = 0;
    let fitH = 0;
    let fitDpr = 0;
    let measureTimer = 0;

    // Backing store follows the box the fixed canvas actually fills: the
    // viewport minus any classic scrollbar (clientWidth, not innerWidth), the
    // same width every pin position was measured against. Capped at 2x. A size
    // change clears it, so the next draw repaints. Compares numbers, not a built
    // string: this runs on every tick.
    const fit = () => {
      const root = document.documentElement;
      const w = root.clientWidth;
      const h = root.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w === fitW && h === fitH && dpr === fitDpr) return;
      fitW = w;
      fitH = h;
      fitDpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawnScroll = NaN;
    };

    // Where the needle wants to be: two thirds down the viewport, easing to the
    // bottom of the world so the thread finishes with the last section.
    const needleTarget = () => {
      const vh = window.innerHeight;
      const top = window.scrollY - worldTop;
      const travel = height - vh;
      let end = Math.min(1, Math.max(0, (top - (travel - vh * 0.6)) / (vh * 0.6)));
      end = end * end * (3 - 2 * end);
      return top + vh * (0.66 + 0.34 * end);
    };

    const lightMarks = () => {
      for (const mark of marks) {
        const on = current >= mark.y - 6;
        if (on !== mark.on) {
          mark.on = on;
          mark.el.classList.toggle('is-passed', on);
        }
      }
    };

    const draw = () => {
      const vh = fitH;
      const top = window.scrollY - worldTop; // world y at the top of the viewport
      ctx.clearRect(0, 0, fitW, vh);
      if (!samples.length || top > height || top + vh < 0) return;

      const needle = Math.max(0, current);
      const first = Math.max(0, firstWhere(samples, (s) => s[MAXY] >= top - 170) - 1);
      const last = firstWhere(samples, (s) => s[MAXY] > top + vh + 170);
      const tipAt = firstWhere(samples, (s) => s[MAXY] >= needle);
      // The needle sits between two samples about 12px apart; interpolate so it
      // glides with the damped position instead of stepping sample to sample.
      const above = samples[tipAt > 0 ? tipAt - 1 : 0];
      const below = samples[tipAt];
      const span = below[MAXY] - above[MAXY];
      const along = span > 0 ? Math.min(1, Math.max(0, (needle - above[MAXY]) / span)) : 1;
      const tipX = above[X] + (below[X] - above[X]) * along;
      const tipY = above[Y] + (below[Y] - above[Y]) * along;
      const finished = needle >= samples[samples.length - 1][MAXY] - 2;

      // The plotted route ahead of the needle: digitized, not yet sewn.
      if (!reduced && !finished && tipAt < last) {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = C4;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.moveTo(tipX, tipY - top);
        for (let i = Math.max(tipAt, first); i <= last; i++) ctx.lineTo(samples[i][X], samples[i][Y] - top);
        ctx.stroke();
        ctx.restore();
      }

      // The sewn thread, from the top of the screen down to the needle.
      const sewnTo = Math.min(tipAt - 1, last);
      if (sewnTo > first || (tipAt > 0 && tipAt - 1 <= last)) {
        const path = new Path2D();
        path.moveTo(samples[first][X], samples[first][Y] - top);
        for (let i = first + 1; i <= sewnTo; i++) path.lineTo(samples[i][X], samples[i][Y] - top);
        if (tipAt - 1 <= last) path.lineTo(tipX, tipY - top);
        const phase = samples[first][LEN];
        ctx.lineJoin = 'round';
        for (const [color, alpha, width, cap, dash, offset, dx, dy] of STRANDS) {
          ctx.save();
          ctx.translate(dx, dy);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.lineCap = cap;
          ctx.setLineDash(dash || []);
          ctx.lineDashOffset = offset + phase;
          ctx.stroke(path);
          ctx.restore();
        }
      }

      // The needle: a small bright bead with a soft glow.
      if (!reduced && needle > 2 && !finished) {
        const x = tipX;
        const y = tipY - top;
        if (y > -30 && y < vh + 30) {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, 18);
          glow.addColorStop(0, 'rgba(223,246,255,.8)');
          glow.addColorStop(1, 'rgba(223,246,255,0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = C4;
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const measure = () => {
      if (!wide.matches) {
        // Below the breakpoint the canvas is hidden by CSS. Drop the route and
        // shrink the bitmap so no stale frame or memory is left behind. Unlight
        // the beads first: `.is-passed` outranks the narrow-screen bullet style,
        // so a bead lit before the window was narrowed would keep its glow.
        for (const mark of marks) mark.el.classList.remove('is-passed');
        samples = [];
        marks = [];
        fitW = 0;
        fitH = 0;
        canvas.width = 1;
        canvas.height = 1;
        return;
      }
      const route = buildThread(world);
      if (!route) return;
      samples = route.samples;
      marks = route.marks;
      height = world.offsetHeight;
      worldTop = sectionTop(world);
      current = reduced ? height : needleTarget();
      drawnCurrent = NaN;
      lightMarks();
      paintIfMoved();
    };

    const schedule = () => {
      clearTimeout(measureTimer);
      measureTimer = setTimeout(measure, 140);
    };

    // Repaint when the needle or the scroll position actually moved. Cheap to
    // call twice a frame: the second call finds nothing changed.
    const paintIfMoved = () => {
      if (!samples.length || !wide.matches) return;
      fit();
      const scroll = window.scrollY;
      if (current === drawnCurrent && scroll === drawnScroll) return;
      drawnCurrent = current;
      drawnScroll = scroll;
      lightMarks();
      draw();
    };

    // Damp toward the target with the repo's frame-rate-independent idiom;
    // slower sewing forward than unpicking back.
    const tick = (time, deltaMs) => {
      if (!samples.length || !wide.matches) return;
      if (!reduced) {
        const gap = needleTarget() - current;
        if (Math.abs(gap) < 0.3) current += gap;
        else current += gap * (1 - Math.exp(-(Math.min(deltaMs, 50) / 1000) * (gap > 0 ? 3 : 6)));
      }
      paintIfMoved();
    };

    // SmoothScroll calls ScrollTrigger.update() from Lenis's scroll event, after
    // Lenis has written the new scroll position; repainting here keeps the
    // thread locked to the page while it moves. Only active while the world is
    // on screen.
    const trigger = ScrollTrigger.create({
      trigger: world,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: paintIfMoved,
    });

    // Remeasure straight away (not debounced): measure() snaps the needle to the
    // end of the route when reduced, or back to the scroll position when not.
    const onMotionChange = () => {
      reduced = motion.matches;
      measure();
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(world);
    wide.addEventListener('change', schedule);
    motion.addEventListener('change', onMotionChange);
    document.fonts?.ready.then(schedule);
    gsap.ticker.add(tick);
    schedule();

    return () => {
      clearTimeout(measureTimer);
      trigger.kill();
      observer.disconnect();
      wide.removeEventListener('change', schedule);
      motion.removeEventListener('change', onMotionChange);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div className="hx-thread" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
