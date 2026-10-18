import Reveal from '../Reveal';
import CompareSlider from './CompareSlider';
import { Checkpoint, Pin } from './Pin';
import { INSPECTION_CHECKS } from '../../lib/heritage.mjs';

// 05 Quality control: the emotional and technical centre of the page. A
// before/after comparison (currently original vs corrected artwork, see the
// note below) beside the inspection sheet of what is checked between sew-out 01
// and 02.
export default function Quality() {
  return (
    <section className="hx-section hx-quality" id="quality" aria-labelledby="hx-quality-title">
      <Pin lane="r" top="92px" />
      <div className="hx-inner">
        <Reveal className="hx-quality-head" y={28}>
          <div className="hx-label" style={{ marginBottom: 26 }}>05 — Quality control / in-house</div>
          <h2 className="hx-quality-title" id="hx-quality-title">
            One sew-out is a test.
            <br />
            <em>The next one proves the correction.</em>
          </h2>
        </Reveal>
        <div className="hx-quality-grid">
          <Reveal className="hx-compare-wrap" y={28}>
            {/* These two frames are artwork, not sew-out photos: the original
                mascot beside the corrected version. Swap in a real first and
                corrected sew-out pair when the shop has one photographed. */}
            <CompareSlider
              before={{
                src: '/heritage/artwork-original.webp',
                w: 500,
                h: 500,
                alt: 'Original artwork: a Mountie moose mascot with rough linework',
              }}
              after={{
                src: '/heritage/artwork-corrected.webp',
                w: 500,
                h: 500,
                alt: 'Corrected artwork: the same mascot with cleaner outlines and detail',
              }}
              beforeLabel="the original artwork"
              afterLabel="the corrected artwork"
            />
            <div className="hx-compare-meta">
              <span>DRAG TO COMPARE</span>
              <span>BEFORE → AFTER CORRECTION</span>
            </div>
          </Reveal>
          <Reveal className="hx-sheet" y={28}>
            <div className="hx-sheet-head">
              <span>INSPECTION SHEET</span>
              <span>CHECKED BETWEEN SEW-OUT 01 AND 02</span>
            </div>
            <ul className="hx-sheet-grid">
              {INSPECTION_CHECKS.map((check) => (
                <li className="hx-sheet-cell" key={check.title}>
                  <h3>{check.title}</h3>
                  <p>{check.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
      <Checkpoint side="right" top="62%" />
    </section>
  );
}
