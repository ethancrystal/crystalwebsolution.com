// Project Realtime: one private channel per project topic, shared by every
// component on the page that listens to it.
//
// Why a registry: supabase-js hands back the SAME channel object when asked
// for a topic it already has. Two components each opening
// `project:<id>:shared` would share one channel, subscribe it twice, and the
// first to unmount would remove it from under the other. Every consumer goes
// through subscribeProjectTopics() instead: the first consumer of a topic
// opens it, later ones join, and the last to leave removes it.
//
// Topics and events come from the database (migrations 0009, 0032, 0050, 0051):
// private broadcasts whose payloads carry identifiers only. The
// realtime.messages policies (private.can_subscribe_project_topic) decide who
// may join: `shared` is every project participant, `internal` is staff only.
// A payload is a signal to re-read through the RLS-protected read model,
// never data to render.
//
// A private broadcast only reaches a *private* channel, and a private join is
// authorized against the socket's JWT, so the socket is authed (setAuth) before
// any join: supabase-js only refreshes the token asynchronously on connect.

export const PROJECT_EVENTS = Object.freeze([
  'project_message_created',
  'project_message_updated',
  'project_status_changed',
  'project_task_changed',
  'project_approval_changed',
  'project_proposal_changed',
]);

// Delivered to listeners when a channel joins again after a drop: anything
// broadcast while the socket was down is lost, so consumers re-read.
export const RESYNC_EVENT = 'resync';

const registries = new WeakMap();

function registryFor(supabase) {
  let registry = registries.get(supabase);
  if (!registry) {
    registry = new Map();
    registries.set(supabase, registry);
  }
  return registry;
}

function presenceList(channel) {
  if (typeof channel.presenceState !== 'function') return [];
  return Object.values(channel.presenceState() ?? {}).flat();
}

function open(supabase, topic) {
  const entry = {
    topic,
    channel: null,
    refs: 0,
    listeners: new Set(),
    presenceListeners: new Set(),
    trackPayload: null,
    joined: false,
  };
  const emit = (event, payload) => {
    for (const listener of [...entry.listeners]) listener(event, payload ?? {}, topic);
  };

  let channel = supabase.channel(topic, { config: { private: true } });
  for (const event of PROJECT_EVENTS) {
    channel = channel.on('broadcast', { event }, (message) => emit(event, message?.payload));
  }
  // Presence lives on the shared topic, where everyone on the project meets.
  if (topic.endsWith(':shared')) {
    channel = channel.on('presence', { event: 'sync' }, () => {
      const list = presenceList(entry.channel);
      for (const listener of [...entry.presenceListeners]) listener(list);
    });
  }
  entry.channel = channel;

  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      if (entry.joined) emit(RESYNC_EVENT, {});
      entry.joined = true;
      if (entry.trackPayload && typeof entry.channel.track === 'function') {
        void entry.channel.track(entry.trackPayload);
      }
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn(`Project realtime ${topic}: ${status}`, err);
    }
  });

  registryFor(supabase).set(topic, entry);
  return entry;
}

function release(supabase, entry) {
  entry.refs -= 1;
  if (entry.refs > 0) return;
  registryFor(supabase).delete(entry.topic);
  supabase.removeChannel(entry.channel);
}

// Listens on `topics` (e.g. ['project:<id>:shared', 'project:<id>:internal']).
//   onEvent(event, payload, topic)  every PROJECT_EVENTS broadcast, plus
//                                   RESYNC_EVENT after a reconnect
//   onPresence(list)                presence on a shared topic changed
//   presence                        payload to track on a shared topic
// Returns an unsubscribe function; safe to call before the async auth has
// finished (nothing is opened after it).
export function subscribeProjectTopics(supabase, topics, { onEvent, onPresence, presence } = {}) {
  let cancelled = false;
  const held = [];

  (async () => {
    try {
      await supabase.realtime.setAuth();
    } catch (err) {
      console.warn('Project realtime auth failed; live updates are off.', err);
      return;
    }
    if (cancelled) return;

    for (const topic of topics) {
      const entry = registryFor(supabase).get(topic) ?? open(supabase, topic);
      entry.refs += 1;
      if (onEvent) entry.listeners.add(onEvent);
      const isShared = topic.endsWith(':shared');
      if (isShared && onPresence) {
        entry.presenceListeners.add(onPresence);
        if (entry.joined) onPresence(presenceList(entry.channel));
      }
      const tracks = Boolean(isShared && presence);
      if (tracks) {
        entry.trackPayload = presence;
        if (entry.joined && typeof entry.channel.track === 'function') void entry.channel.track(presence);
      }
      held.push({ entry, tracks });
    }
  })();

  return () => {
    cancelled = true;
    for (const { entry, tracks } of held.splice(0)) {
      if (onEvent) entry.listeners.delete(onEvent);
      if (onPresence) entry.presenceListeners.delete(onPresence);
      if (tracks && entry.trackPayload === presence) {
        entry.trackPayload = null;
        if (entry.refs > 1 && typeof entry.channel.untrack === 'function') void entry.channel.untrack();
      }
      release(supabase, entry);
    }
  };
}

export function projectTopic(projectId, visibility) {
  return `project:${projectId}:${visibility}`;
}
