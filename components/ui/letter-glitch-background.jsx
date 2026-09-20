'use client';
// @ts-check

import { useEffect, useRef } from 'react';

// Adapted from React Bits' Letter Glitch (reactbits.dev/backgrounds/letter-glitch,
// JS-CSS variant). A 2D ASCII lattice that reshuffles glyphs — the closest
// CRT sibling to Faulty Terminal without leaving the cyan / silver / black
// family. Brand palette: blue, cyan, muted silver, ink.

const GLITCH_COLORS = ['#3c6cff', '#59f3ff', '#8b98b8', '#eaf2ff'];
const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789';
const FALLBACK_RGB = { r: 89, g: 243, b: 255 };
const FONT_SIZE = 16;
const CHAR_WIDTH = 10;
const CHAR_HEIGHT = 20;
const GLITCH_SPEED = 70;

function hexToRgb(hex) {
  const normalized = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => `${r}${r}${g}${g}${b}${b}`);
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  return match
    ? {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16)
      }
    : null;
}

function mixRgb(start, end, factor) {
  return {
    r: Math.round(start.r + (end.r - start.r) * factor),
    g: Math.round(start.g + (end.g - start.g) * factor),
    b: Math.round(start.b + (end.b - start.b) * factor)
  };
}

function rgbToCss({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

function randomChar() {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

function randomRgb() {
  return hexToRgb(GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)]) || FALLBACK_RGB;
}

function LetterGlitch() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let letters = [];
    let columns = 0;
    let rows = 0;
    let raf = 0;
    let lastGlitch = Date.now();
    let resizeTimer = 0;

    function drawLetters() {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.textBaseline = 'top';
      for (let index = 0; index < letters.length; index++) {
        const letter = letters[index];
        const x = (index % columns) * CHAR_WIDTH;
        const y = Math.floor(index / columns) * CHAR_HEIGHT;
        ctx.fillStyle = rgbToCss(letter.rgb);
        ctx.fillText(letter.char, x, y);
      }
    }

    function initialize(width, height) {
      columns = Math.ceil(width / CHAR_WIDTH);
      rows = Math.ceil(height / CHAR_HEIGHT);
      const total = columns * rows;
      letters = Array.from({ length: total }, () => {
        const rgb = randomRgb();
        return { char: randomChar(), rgb, fromRgb: rgb, targetRgb: randomRgb(), colorProgress: 1 };
      });
    }

    function resizeCanvas() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initialize(rect.width, rect.height);
      drawLetters();
    }

    function updateLetters() {
      const updateCount = Math.max(1, Math.floor(letters.length * 0.05));
      for (let i = 0; i < updateCount; i++) {
        const index = Math.floor(Math.random() * letters.length);
        const letter = letters[index];
        if (!letter) continue;
        letter.char = randomChar();
        letter.fromRgb = letter.rgb;
        letter.targetRgb = randomRgb();
        letter.colorProgress = 0;
      }
    }

    function handleSmooth() {
      let needsRedraw = false;
      for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        if (letter.colorProgress < 1) {
          letter.colorProgress = Math.min(1, letter.colorProgress + 0.05);
          letter.rgb = mixRgb(letter.fromRgb, letter.targetRgb, letter.colorProgress);
          needsRedraw = true;
        }
      }
      if (needsRedraw) drawLetters();
    }

    function animate() {
      const now = Date.now();
      if (now - lastGlitch >= GLITCH_SPEED) {
        updateLetters();
        drawLetters();
        lastGlitch = now;
      }
      handleSmooth();
      raf = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        resizeCanvas();
        raf = requestAnimationFrame(animate);
      }, 100);
    };

    resizeCanvas();
    raf = requestAnimationFrame(animate);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="letter-glitch-container">
      <canvas ref={canvasRef} />
      <div className="letter-glitch-vignette" />
    </div>
  );
}

/** @returns {import('react').ReactElement} */
export default function LetterGlitchBackground() {
  return (
    <div className="letter-glitch-bg" aria-hidden="true">
      <LetterGlitch />
      <style jsx>{`
        .letter-glitch-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: #04060c;
        }
        .letter-glitch-bg :global(.letter-glitch-container),
        .letter-glitch-bg :global(canvas) {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .letter-glitch-bg :global(canvas) {
          display: block;
          opacity: 0.34;
        }
        .letter-glitch-bg :global(.letter-glitch-vignette) {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 28%, rgba(4, 6, 12, 0.78) 0%, rgba(4, 6, 12, 0.28) 38%, rgba(4, 6, 12, 0.94) 100%);
        }
        @media (prefers-reduced-motion: reduce), (max-width: 767px) {
          .letter-glitch-bg {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
