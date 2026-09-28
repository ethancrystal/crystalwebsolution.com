// Letter-scramble frames (adapted from doordennis.nl's text-animator): every
// non-space character is swapped for a random glyph SCRAMBLE_STEPS times,
// SCRAMBLE_STEP_MS apart, then the original text is restored.
export const SCRAMBLE_GLYPHS = 'abcdefghijklmnopqrstuvwxyz!@#$%^&*-_+=;:<>,';
export const SCRAMBLE_STEPS = 4;
export const SCRAMBLE_STEP_MS = 80;

export function scrambleFrame(text, random = Math.random) {
  let out = '';
  for (const ch of text) {
    out += ch.trim() ? SCRAMBLE_GLYPHS[Math.floor(random() * SCRAMBLE_GLYPHS.length)] : ch;
  }
  return out;
}
