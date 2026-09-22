'use client';

import dynamic from 'next/dynamic';
import { useStage } from './StageContext';

const DarkPageBackground = dynamic(() => import('../ui/dark-page-background'), {
  ssr: false,
});

// Renders the cyan-silver animated stage scoped to the hero box only (see
// .mkt-hero-stage in app/styles/service-pages.css, which overrides the
// stage modules' own `position: fixed` to `position: absolute` so they fill
// this container instead of the viewport). Pages outside the
// MARKETING_STAGE_BACKGROUNDS whitelist (SubpageExperience.jsx) get a null
// stage and render nothing here — no full-page or inner-page stage.
export default function HeroStage() {
  const stage = useStage();
  if (!stage) return null;

  return (
    <div className="mkt-hero-stage" aria-hidden="true">
      <DarkPageBackground interactive={stage} />
    </div>
  );
}
