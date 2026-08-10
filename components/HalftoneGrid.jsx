'use client';

import React, { useEffect, useRef } from 'react';

export default function HalftoneGrid() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const targetMouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Grid config
    const spacing = 40;
    let cols = Math.ceil(width / spacing) + 1;
    let rows = Math.ceil(height / spacing) + 1;

    // Generate static embroidery stitch paths (curves)
    const stitchPaths = [];
    const numCurves = 4;
    for (let c = 0; c < numCurves; c++) {
      const points = [];
      const startY = height * (0.2 + c * 0.2);
      const curveHeight = height * 0.15;
      const steps = 20;

      for (let s = 0; s <= steps; s++) {
        const x = (width / steps) * s;
        // Create an organic wave shape
        const y = startY + Math.sin((s / steps) * Math.PI * 2 + c) * curveHeight;
        points.push({ x, y, baseX: x, baseY: y });
      }

      // Select color based on CWS color tokens
      let color = 'rgba(60, 108, 255, 0.25)'; // Blue/indigo
      if (c % 3 === 1) color = 'rgba(6, 182, 212, 0.25)'; // Cyan
      if (c % 3 === 2) color = 'rgba(168, 85, 247, 0.2)'; // Violet

      stitchPaths.push({ points, color });
    }

    // Check motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e) => {
      prefersReducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      cols = Math.ceil(width / spacing) + 1;
      rows = Math.ceil(height / spacing) + 1;
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const drawDashedPath = (points, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      // Custom dash rendering to simulate actual physical embroidery stitches
      ctx.beginPath();
      let drawing = true;
      let stepLen = 6; // Stitch length
      let gapLen = 4;  // Gap between stitches
      let currentDist = 0;

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const segmentLength = Math.sqrt(dx * dx + dy * dy);

        let progress = 0;
        while (progress < segmentLength) {
          const remaining = segmentLength - progress;
          let chunk = remaining;

          if (drawing) {
            const leftToDraw = stepLen - currentDist;
            if (chunk > leftToDraw) {
              chunk = leftToDraw;
              progress += chunk;
              const tx = p1.x + (dx * progress) / segmentLength;
              const ty = p1.y + (dy * progress) / segmentLength;
              ctx.lineTo(tx, ty);
              ctx.stroke();
              drawing = false;
              currentDist = 0;
            } else {
              progress += chunk;
              const tx = p1.x + (dx * progress) / segmentLength;
              const ty = p1.y + (dy * progress) / segmentLength;
              ctx.lineTo(tx, ty);
              currentDist += chunk;
            }
          } else {
            const leftToGap = gapLen - currentDist;
            if (chunk > leftToGap) {
              chunk = leftToGap;
              progress += chunk;
              const tx = p1.x + (dx * progress) / segmentLength;
              const ty = p1.y + (dy * progress) / segmentLength;
              ctx.moveTo(tx, ty);
              drawing = true;
              currentDist = 0;
            } else {
              progress += chunk;
              const tx = p1.x + (dx * progress) / segmentLength;
              const ty = p1.y + (dy * progress) / segmentLength;
              ctx.moveTo(tx, ty);
              currentDist += chunk;
            }
          }
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Lerp mouse coordinates for cinematic dampening
      if (!prefersReducedMotion && mouseRef.current.active) {
        mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.1;
        mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.1;
      } else if (!mouseRef.current.active) {
        // Slowly drift mouse away when inactive so there is always a soft focus point
        mouseRef.current.x += (-1000 - mouseRef.current.x) * 0.05;
        mouseRef.current.y += (-1000 - mouseRef.current.y) * 0.05;
      }

      // 1. Draw Halftone Screen Printing Grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * spacing;
          const y = r * spacing;

          // Calculate distance to pointer
          const dx = mouseRef.current.x - x;
          const dy = mouseRef.current.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Halftone visual equation: proximity scales dot radius
          let radius = 1;
          const maxInfluence = 250;

          if (dist < maxInfluence && !prefersReducedMotion) {
            const factor = 1 - dist / maxInfluence;
            radius = 1 + factor * 5; // Dot grows up to 6px near the mouse

            // Subtle shift of dot position toward/away from the pointer
            const angle = Math.atan2(dy, dx);
            const displace = factor * 4;
            const shiftedX = x - Math.cos(angle) * displace;
            const shiftedY = y - Math.sin(angle) * displace;

            // Draw a slightly glowing cyan or white dot
            ctx.fillStyle = `rgba(6, 182, 212, ${0.04 + factor * 0.12})`;
            ctx.beginPath();
            ctx.arc(shiftedX, shiftedY, radius, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }

          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw Embroidered Stitch Curves
      stitchPaths.forEach((path) => {
        const animatedPoints = path.points.map((p) => {
          if (prefersReducedMotion) return p;

          // Stitches respond physically to cursor
          const dx = mouseRef.current.x - p.baseX;
          const dy = mouseRef.current.y - p.baseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxInfluence = 200;

          if (dist < maxInfluence) {
            const factor = 1 - dist / maxInfluence;
            const angle = Math.atan2(dy, dx);
            // Push the stitch curve slightly away from cursor to feel elastic
            const displace = factor * 15 * Math.sin(Date.now() * 0.003 + p.baseX * 0.01);
            return {
              x: p.baseX - Math.cos(angle) * displace,
              y: p.baseY - Math.sin(angle) * displace,
            };
          }

          // Subtle organic idle wave
          const idleWave = Math.sin(Date.now() * 0.001 + p.baseX * 0.005) * 2;
          return {
            x: p.baseX,
            y: p.baseY + idleWave,
          };
        });

        drawDashedPath(animatedPoints, path.color);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      mediaQuery.removeEventListener('change', handleMotionChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
