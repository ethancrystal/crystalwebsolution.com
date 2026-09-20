'use client';
// @ts-check

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

// Adapted from React Bits' Acid Squares (reactbits.dev/backgrounds/acid-squares,
// JS-CSS variant). A volumetric square-field raymarch on a full-screen ogl
// triangle. Restyled to the site tokens: blue wells, cyan midtones, silver
// peaks on --bg. Shaders stay WebGL1 so this matches Prism / Ripple Grid.
//
// Window-level pointer tracking: marketing `main` sits above the canvas, so
// a container mousemove would never fire.

const COLOR1 = [0.23529411764705882, 0.4235294117647059, 1]; // #3c6cff
const COLOR2 = [0.34901960784313724, 0.9529411764705882, 1]; // #59f3ff
const COLOR3 = [0.9176470588235294, 0.9490196078431372, 1]; // #eaf2ff

const vertex = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uWaveDepth;
uniform float uZoom;
uniform float uDensity;
uniform float uSpread;
uniform float uStepSize;
uniform float uGlow;
uniform float uExposure;
uniform float uColorShift;
uniform float uContrast;
uniform float uBrightness;
uniform float uOpacity;
uniform float uSteps;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uMouseRadius;
uniform float uEnableMouse;
uniform float uMouseActive;
uniform float uGrain;
uniform float uGrainIntensity;

float tanhApprox(float x) {
  x = clamp(x, -10.0, 10.0);
  float e2 = exp(2.0 * x);
  return (e2 - 1.0) / (e2 + 1.0);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float zoom = max(uZoom, 0.05);
  float aspect = iResolution.x / iResolution.y;
  vec2 ndc = (2.0 * frag - iResolution.xy) / iResolution.y;
  vec2 dir = ndc * (0.5 / zoom);

  vec2 mouseNdc = vec2(uMouse.x * aspect, uMouse.y);
  float mr = max(uMouseRadius, 0.01);
  vec2 md = ndc - mouseNdc;
  float dent = exp(-dot(md, md) / (mr * mr)) * (3.0 * uMouseStrength * uEnableMouse * uMouseActive);

  float travel = sin(iTime * uSpeed) * uWaveDepth;
  float density = max(uDensity, 1.0);
  float spread = clamp(uSpread, 0.05, 0.6);
  float stepSize = max(uStepSize, 0.0005);
  float glowGain = max(uGlow, 0.0);

  vec3 tOffset = vec3(0.0, dent, travel);
  vec3 p = vec3(0.0);
  float s = 0.0;
  float glow = 0.0;

  for (int i = 0; i < 64; i++) {
    if (float(i) >= uSteps) break;
    p += vec3(dir * s, s);
    vec3 q = p + tOffset;
    s += density - length(q.xz) + length(ceil(q).xy);
    s = stepSize + abs(s) * spread;
    glow += glowGain / s;
  }

  float e = glow / max(uExposure, 1.0);
  float shimmer = 0.5 + 0.5 * dot(cos(iTime * uColorShift + p), vec3(0.3333));
  float v = tanhApprox(e * uBrightness * mix(0.7, 1.05, shimmer));
  v = clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0);

  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, 0.55, v));
  col = mix(col, uColor3, smoothstep(0.55, 1.0, v));
  col *= v;

  float a = clamp(v, 0.0, 1.0) * uOpacity;
  vec3 outRgb = col * a;
  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    a = clamp(a + gv, 0.0, 1.0);
  }
  gl_FragColor = vec4(outRgb, a);
}
`;

function AcidSquares() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: 0.45 },
        uWaveDepth: { value: 0.85 },
        uZoom: { value: 1.25 },
        uDensity: { value: 10.0 },
        uSpread: { value: 0.3 },
        uStepSize: { value: 0.002 },
        uGlow: { value: 1.0 },
        uExposure: { value: 2700 },
        uColorShift: { value: 0.35 },
        uContrast: { value: 1.05 },
        uBrightness: { value: 0.92 },
        uOpacity: { value: 0.95 },
        uSteps: { value: 32 },
        uColor1: { value: new Float32Array(COLOR1) },
        uColor2: { value: new Float32Array(COLOR2) },
        uColor3: { value: new Float32Array(COLOR3) },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseStrength: { value: 0.12 },
        uMouseRadius: { value: 0.38 },
        uEnableMouse: { value: 1.0 },
        uMouseActive: { value: 0.0 },
        uGrain: { value: 1.0 },
        uGrainIntensity: { value: 0.04 }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });
    const mouseTarget = [0, 0];
    const mouseCurrent = [0, 0];
    let mouseActive = 0;
    let mouseActiveTarget = 0;

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h);
      const res = program.uniforms.iResolution.value;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouseTarget[0] = ((event.clientX - rect.left) / rect.width - 0.5) * 2.0;
      mouseTarget[1] = -((event.clientY - rect.top) / rect.height - 0.5) * 2.0;
      mouseActiveTarget = 1;
    };
    const handleMouseLeave = () => {
      mouseActiveTarget = 0;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    let raf = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    const t0 = performance.now();

    const loop = (t) => {
      program.uniforms.iTime.value = (t - t0) * 0.001;
      mouseCurrent[0] += 0.05 * (mouseTarget[0] - mouseCurrent[0]);
      mouseCurrent[1] += 0.05 * (mouseTarget[1] - mouseCurrent[1]);
      const mouse = program.uniforms.uMouse.value;
      mouse[0] = mouseCurrent[0];
      mouse[1] = mouseCurrent[1];
      mouseActive += 0.05 * (mouseActiveTarget - mouseActive);
      program.uniforms.uMouseActive.value = mouseActive;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    const tryStart = () => {
      if (isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(loop);
    };
    const tryStop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) tryStart();
        else tryStop();
      },
      { threshold: 0 }
    );
    io.observe(container);

    const onVisibility = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) tryStart();
      else tryStop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    tryStart();

    return () => {
      tryStop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (canvas.parentElement === container) container.removeChild(canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <div ref={containerRef} className="acid-squares-container" />;
}

/** @returns {import('react').ReactElement} */
export default function AcidSquaresBackground() {
  return (
    <div className="acid-squares-bg" aria-hidden="true">
      <AcidSquares />
      <style jsx>{`
        .acid-squares-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: #04060c;
        }
        .acid-squares-bg :global(.acid-squares-container) {
          position: relative;
          width: 100%;
          height: 100%;
        }
        @media (prefers-reduced-motion: reduce), (max-width: 767px) {
          .acid-squares-bg {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
