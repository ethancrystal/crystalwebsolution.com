import { BEAT_IDS } from './beatProgress.js';

// Plain-language labels for the homepage beats, in scroll order. The poetic
// section headlines stay as they are; these are the words JourneyNav shows so
// a visitor can tell where they are and jump without decoding the headlines.
// One entry per BEAT_IDS id — tests/journeyNav.test.mjs keeps them in step.
const LABELS = Object.freeze({
  hero: 'Intro',
  about: 'About',
  services: 'Services',
  approach: 'How we work',
  stories: 'Client stories',
  mark: 'Brand systems',
  lab: 'Capabilities',
  motion: 'Selected work',
  contact: 'Contact',
});

export const JOURNEY_NAV = Object.freeze(
  BEAT_IDS.map((id) => Object.freeze({ id, label: LABELS[id] ?? id })),
);
