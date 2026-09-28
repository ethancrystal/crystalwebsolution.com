'use client';

import { createContext, useContext } from 'react';

// Carries which cyan-silver stage module (if any) the current marketing page
// wants behind its hero. Static per-page config, not a per-frame value, so a
// context is the right tool here (contrast with the RAF singletons in
// lib/scrollState.js etc. — see CLAUDE.md's per-frame-state rule, which does
// not apply to this one-time-per-navigation value).
const StageContext = createContext(null);

export function StageProvider({ stage, children }) {
  return <StageContext.Provider value={stage}>{children}</StageContext.Provider>;
}

export function useStage() {
  return useContext(StageContext);
}
