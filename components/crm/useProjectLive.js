import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { RESYNC_EVENT, projectTopic, subscribeProjectTopics } from '@/lib/crm/projectRealtime';

// Live project page: tells the page when its project changed (status, tasks,
// approvals, messages) and who else is looking at it right now.
//
//   const { viewers } = useProjectLive({ projectId, profile, onChange });
//
// onChange(events) receives the Set of event names seen in the last burst
// (debounced: one status change fans out to two topics, and a staff action
// often writes several rows). RESYNC_EVENT means "re-read everything": the
// connection dropped and events may have been missed. Pages re-read through
// their normal loaders; payloads are identifiers only.
//
// viewers: other people on the project page, as { userId, name }, one entry
// per person however many tabs they have open. Names only, never contact
// details. Presence is tracked on the shared topic, so clients and staff see
// each other.

export function uniqueViewers(states, selfId) {
  const byUser = new Map();
  for (const state of states ?? []) {
    if (!state?.userId || state.userId === selfId || byUser.has(state.userId)) continue;
    byUser.set(state.userId, { userId: state.userId, name: String(state.name ?? '').trim() || 'Someone' });
  }
  return [...byUser.values()];
}

export function useProjectLive({ projectId, profile, onChange, debounceMs = 250 }) {
  const [viewers, setViewers] = useState([]);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const userId = profile?.id;
  const role = profile?.role;
  const name = profile?.full_name ?? '';

  useEffect(() => {
    if (!projectId || !userId || !role) return undefined;

    let timer = null;
    let pending = new Set();
    const flush = () => {
      timer = null;
      const events = pending;
      pending = new Set();
      onChangeRef.current?.(events);
    };

    const visibilities = role === 'client' ? ['shared'] : ['shared', 'internal'];
    const unsubscribe = subscribeProjectTopics(
      createClient(),
      visibilities.map((visibility) => projectTopic(projectId, visibility)),
      {
        onEvent: (event, payload) => {
          if (event !== RESYNC_EVENT && payload?.project_id !== projectId) return;
          pending.add(event);
          if (!timer) timer = setTimeout(flush, debounceMs);
        },
        onPresence: (states) => setViewers(uniqueViewers(states, userId)),
        presence: { userId, name },
      },
    );

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
      setViewers([]);
    };
  }, [projectId, userId, role, name, debounceMs]);

  return { viewers };
}

// True when a burst touched more than messages (which ProjectThread already
// reloads on its own).
export function touchesWorkspace(events) {
  for (const event of events ?? []) {
    if (event !== 'project_message_created' && event !== 'project_message_updated') return true;
  }
  return false;
}
