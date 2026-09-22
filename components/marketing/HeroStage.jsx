'use client';

import dynamic from 'next/dynamic';
import { useStage } from './StageContext';

const DarkPageBackground = dynamic(() => import('../ui/dark-page-background'), {
  ssr: false,
});

/**
 * The cyan-silver animated stage, scoped to the section that hosts it.
 *
 * `.mkt-hero-stage` in app/styles/service-pages.css overrides the stage
 * modules' own `position: fixed` to `absolute`, so each one fills its host
 * instead of the viewport, and dims them all through a single opacity knob.
 *
 * Pages outside MARKETING_STAGE_BACKGROUNDS (SubpageExperience.jsx) get a
 * null stage and render nothing here.
 *
 * @param {Object} props
 * @param {'fill'|'band'} [props.variant] `fill` (default) stretches to the
 *   host section, for hosts that are a real hero box. `band` paints a fixed
 *   height at the top, for pages whose first section is the whole article
 *   and therefore has no hero-sized box to fill.
 */
export default function HeroStage({ variant = 'fill' }) {
  const stage = useStage();
  if (!stage) return null;

  return (
    <div
      className={`mkt-hero-stage${variant === 'band' ? ' mkt-hero-stage--band' : ''}`}
      aria-hidden="true"
    >
      <DarkPageBackground interactive={stage} />
    </div>
  );
}
