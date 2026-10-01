import { useEffect, useState } from 'react';
import { browserStorage, readPrefs } from '@/lib/crm/prefs.mjs';

// The tab this person chose to open a dashboard on (Settings > Dashboard), or
// null. Read after mount, never during render, so server and client render
// the same first frame. Hand the result to <Tabs defaultId={...} />.
export function useDefaultTab(role, userId) {
  const [defaultTab, setDefaultTab] = useState(null);

  useEffect(() => {
    setDefaultTab(readPrefs(browserStorage(), userId, role).defaultTab);
  }, [role, userId]);

  return defaultTab;
}
