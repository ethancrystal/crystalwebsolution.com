import Hero from '../sections/Hero';
import Heritage from './Heritage';
import Make from './Make';
import Process from './Process';
import Quality from './Quality';
import Machinery from './Machinery';
import Workbench from './Workbench';
import Offer from './Offer';
import ThreadRail from './ThreadRail';

// The embroidery-first opening of the homepage: hero, heritage, what we make,
// process, quality control, machinery, workbench proof and the patch offer,
// joined by one scroll-drawn thread. It sits on its own opaque ink ground, so
// the camera beats below (About onward) are untouched; the hero beat simply
// lasts for the whole story. The Digital Studio bridge follows this block.
export default function HeritageWorld() {
  return (
    <div className="hx hx-world">
      {/* Shared gradients for the stitched headlines (StitchedTitle). Sized to
          nothing but not display:none, which would drop the gradients. */}
      <svg className="hx-svg-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient
            id="hx-thread-grad"
            gradientUnits="userSpaceOnUse"
            x1="0" y1="0" x2="16.97" y2="16.97"
            spreadMethod="repeat"
          >
            <ThreadStops />
          </linearGradient>
          <linearGradient
            id="hx-thread-grad-sm"
            gradientUnits="userSpaceOnUse"
            x1="0" y1="0" x2="21.21" y2="21.21"
            spreadMethod="repeat"
          >
            <ThreadStops />
          </linearGradient>
          <linearGradient
            id="hx-thread-sheen"
            gradientUnits="userSpaceOnUse"
            x1="0" y1="8" x2="0" y2="88"
            spreadMethod="repeat"
          >
            <stop offset="0" stopColor="#ffffff" stopOpacity=".5" />
            <stop offset=".26" stopColor="#ffffff" stopOpacity="0" />
            <stop offset=".62" stopColor="#04102a" stopOpacity="0" />
            <stop offset="1" stopColor="#04102a" stopOpacity=".45" />
          </linearGradient>
        </defs>
      </svg>
      <ThreadRail />
      <Hero />
      <Heritage />
      <Make />
      <Process />
      <Quality />
      <Machinery />
      <Workbench />
      <Offer />
    </div>
  );
}

// The woven-thread stripe: dark edge, then highlight, mid and shade plies.
const STOPS = [
  [0, 'var(--th1)'], [0.03, 'var(--th1)'], [0.05, 'var(--th4)'], [0.3, 'var(--th4)'],
  [0.32, 'var(--th1)'], [0.35, 'var(--th1)'], [0.37, 'var(--th3)'], [0.62, 'var(--th3)'],
  [0.64, 'var(--th1)'], [0.67, 'var(--th1)'], [0.69, 'var(--th2)'], [0.95, 'var(--th2)'],
  [0.97, 'var(--th1)'], [1, 'var(--th1)'],
];

function ThreadStops() {
  return STOPS.map(([offset, color]) => (
    <stop key={offset} offset={offset} style={{ stopColor: color }} />
  ));
}
