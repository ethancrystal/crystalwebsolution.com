'use client';

import { useRef } from 'react';

// Drag-to-compare for a before and an after (Quality.jsx currently feeds it the
// original and corrected artwork; it will take a sew-out pair as is). The two
// images sit
// stacked and are clipped against a shared split; the split is written straight
// to the DOM (no React state, no animation loop) because it moves with the
// pointer. Keyboard: arrow keys nudge 5%, Home/End jump to either side, so the
// comparison is reachable without a pointer.
const MIN = 2;
const MAX = 98;

export default function CompareSlider({ before, after, beforeLabel, afterLabel }) {
  const frameRef = useRef(null);
  const beforeRef = useRef(null);
  const afterRef = useRef(null);
  const handleRef = useRef(null);
  const splitRef = useRef(50);

  const setSplit = (percent) => {
    const split = Math.min(MAX, Math.max(MIN, percent));
    splitRef.current = split;
    if (beforeRef.current) beforeRef.current.style.clipPath = `inset(0 ${(100 - split).toFixed(2)}% 0 0)`;
    if (afterRef.current) afterRef.current.style.clipPath = `inset(0 0 0 ${split.toFixed(2)}%)`;
    if (handleRef.current) {
      handleRef.current.style.left = `${split.toFixed(2)}%`;
      handleRef.current.setAttribute('aria-valuenow', String(Math.round(split)));
    }
  };

  const onPointerDown = (event) => {
    event.preventDefault();
    const frame = frameRef.current;
    if (!frame) return;
    const handle = event.currentTarget;
    // preventDefault above also cancels the browser's own focus move, so take
    // focus here: the slider's keyboard controls and value then follow the drag
    // (ARIA slider pattern: focus lives on the thumb).
    handle.focus({ preventScroll: true });
    handle.setPointerCapture?.(event.pointerId);
    const move = (ev) => {
      const box = frame.getBoundingClientRect();
      if (!box.width) return;
      setSplit(((ev.clientX - box.left) / box.width) * 100);
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
    move(event);
  };

  const onKeyDown = (event) => {
    const keys = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 };
    if (event.key in keys) setSplit(splitRef.current + keys[event.key]);
    else if (event.key === 'Home') setSplit(MIN);
    else if (event.key === 'End') setSplit(MAX);
    else return;
    event.preventDefault();
  };

  return (
    <div className="hx-compare" ref={frameRef}>
      <div className="hx-compare-pane" ref={afterRef} style={{ clipPath: 'inset(0 0 0 50%)' }}>
        <img src={after.src} width={after.w} height={after.h} alt={after.alt} loading="lazy" decoding="async" />
      </div>
      <div className="hx-compare-pane" ref={beforeRef} style={{ clipPath: 'inset(0 50% 0 0)' }}>
        <img src={before.src} width={before.w} height={before.h} alt={before.alt} loading="lazy" decoding="async" />
      </div>
      <div
        ref={handleRef}
        className="hx-compare-handle"
        style={{ left: '50%' }}
        role="slider"
        tabIndex={0}
        aria-label={`Compare ${beforeLabel} with ${afterLabel}`}
        aria-orientation="horizontal"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={50}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <div className="hx-compare-line" />
        <div className="hx-compare-knob" aria-hidden="true">⟷</div>
      </div>
    </div>
  );
}
