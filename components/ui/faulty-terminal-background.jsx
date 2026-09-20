'use client';
// @ts-check

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

// Adapted from React Bits' Faulty Terminal (reactbits.dev/backgrounds/
// faulty-terminal, JS-CSS variant). A CRT digit-grid fragment shader with
// scanlines, flicker, and a cursor ripple. Tint is site cyan on black so the
// field reads as a silver-blue terminal, not the vendor white/green default.
// Window pointer tracking: marketing `main` covers the canvas.

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;
uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;

float time;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;

  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545;

  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;

  mat2 modify2 = rotate(time * 0.08);
  f += amp * noise(p);

  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time);
  mat2 rot1 = rotate(0.1);

  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;

    if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;
        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }

    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
        intensity *= smoothstep(0.0, 1.0, cellProgress);
    }

    p = fract(p);
    p *= uDigitSize;

    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);
    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;
    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);

    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){
    float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
    bar *= uScanlineIntensity;
    float displacement = displace(p);
    p.x += displacement;
    if (uGlitchAmount != 1.0) {
      p.x += displacement * (uGlitchAmount - 1.0);
    }
    float middle = digit(p);
    const float off = 0.002;
    float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));
    vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    vec2 uv = vUv;
    if(uCurvature != 0.0){
      uv = barrel(uv);
    }
    vec2 p = uv * uScale;
    vec3 col = getColor(p);
    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }
    col *= uTint;
    col *= uBrightness;
    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }
    gl_FragColor = vec4(col, 1.0);
}
`;

function FaultyTerminal() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctn = containerRef.current;
    if (!ctn) return undefined;

    let renderer;
    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: false,
        antialias: false
      });
    } catch {
      return undefined;
    }
    if (!renderer?.gl) return undefined;
    const gl = renderer.gl;
    gl.clearColor(0.01568627450980392, 0.023529411764705882, 0.047058823529411764, 1);

    const geometry = new Triangle(gl);
    const mouse = { x: 0.5, y: 0.5 };
    const smoothMouse = { x: 0.5, y: 0.5 };
    const timeOffset = Math.random() * 100;
    let loadStart = 0;

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Float32Array([gl.canvas.width, gl.canvas.height, 1])
        },
        uScale: { value: 1 },
        uGridMul: { value: new Float32Array([2, 1]) },
        uDigitSize: { value: 1.5 },
        uScanlineIntensity: { value: 0.32 },
        uGlitchAmount: { value: 0.85 },
        uFlickerAmount: { value: 0.55 },
        uNoiseAmp: { value: 0.9 },
        uChromaticAberration: { value: 0.4 },
        uDither: { value: 0.4 },
        uCurvature: { value: 0.14 },
        uTint: { value: new Color(0.34901960784313724, 0.9529411764705882, 1) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseStrength: { value: 0.22 },
        uUseMouse: { value: 1 },
        uPageLoadProgress: { value: 0 },
        uUsePageLoadAnimation: { value: 1 },
        uBrightness: { value: 0.58 }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
      const res = program.uniforms.iResolution.value;
      res[0] = gl.canvas.width;
      res[1] = gl.canvas.height;
      res[2] = gl.canvas.width / Math.max(gl.canvas.height, 1);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(ctn);
    resize();

    const handleMouseMove = (event) => {
      const rect = ctn.getBoundingClientRect();
      mouse.x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      mouse.y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let raf = 0;
    const update = (t) => {
      raf = requestAnimationFrame(update);
      if (loadStart === 0) loadStart = t;
      program.uniforms.iTime.value = (t * 0.001 + timeOffset) * 0.3;
      program.uniforms.uPageLoadProgress.value = Math.min((t - loadStart) / 2000, 1);
      smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
      smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;
      const mouseUniform = program.uniforms.uMouse.value;
      mouseUniform[0] = smoothMouse.x;
      mouseUniform[1] = smoothMouse.y;
      renderer.render({ scene: mesh });
    };
    raf = requestAnimationFrame(update);
    ctn.appendChild(gl.canvas);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      if (gl.canvas.parentElement === ctn) ctn.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <div ref={containerRef} className="faulty-terminal-container" />;
}

/** @returns {import('react').ReactElement} */
export default function FaultyTerminalBackground() {
  return (
    <div className="faulty-terminal-bg" aria-hidden="true">
      <FaultyTerminal />
      <style jsx>{`
        .faulty-terminal-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: #04060c;
        }
        .faulty-terminal-bg :global(.faulty-terminal-container) {
          width: 100%;
          height: 100%;
          position: relative;
        }
        .faulty-terminal-bg :global(canvas) {
          display: block;
          width: 100%;
          height: 100%;
        }
        @media (prefers-reduced-motion: reduce), (max-width: 767px) {
          .faulty-terminal-bg {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
