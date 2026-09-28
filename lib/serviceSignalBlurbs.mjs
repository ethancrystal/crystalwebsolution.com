// Visitor-focused PAS one-liners for each service signal, surfaced by the
// emblem's tooltip toggle. Extracted from components/three/ServiceEmblem3D.jsx
// so the copy has one home and can be shown by any emblem variant without
// importing the three.js runtime.
export const SIGNAL_BLURB = {
  web: 'Your site looks like everyone else and quietly loses the deal before a word is read — so we design with intent, clarity and craft that earns the click and the close.',
  development: 'That internal tool or product idea keeps stalling in hand-off limbo while technical debt piles up — we architect and ship web apps your team can own and extend.',
  brand: 'Your brand reads as a logo file somebody sent once, not a system buyers recognise — so we build a simple, ownable identity that compounds across every touchpoint.',
  logo: 'Your mark does not survive a favicon, a stamp, or a phone lock screen — so we design a logo that holds up at 16px and at billboard scale.',
  marketing: 'Your campaigns earn clicks that bounce because the page underneath breaks the promise — so we align the message and the experience so traffic converts.',
  motion: 'Your story sits still while competitors move, and attention moves on — so we add motion that guides the eye to the one thing that matters.',
  ai: 'AI is either a buzzword in your copy or a black box nobody trusts — so we wire practical, explainable automation into the work you already do.',
  workflow: 'Your team reinvents the hand-off on every project and momentum dies in the gaps — so we design the workflow once, clearly, and let it scale.',
  // Standalone /services/seo pillar (not a homepage rail signal).
  seo: 'You rank for your own name and nothing a buyer types — so we build the pages, links and fixes that put the service you sell in front of the search that wants it.',
};

export default SIGNAL_BLURB;
