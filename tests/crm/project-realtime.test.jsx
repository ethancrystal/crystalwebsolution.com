// lib/crm/projectRealtime.js (one shared channel per topic) and
// components/crm/useProjectLive.js (debounced project changes + presence),
// against a fake supabase client that behaves like supabase-js: channel(topic)
// returns the existing channel for a topic it already has.

import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function fakeClient() {
  const log = [];
  const channels = new Map();
  const client = {
    log,
    removed: [],
    realtime: {
      setAuth: vi.fn(async () => {
        log.push('setAuth');
      }),
    },
    channel(topic, opts) {
      if (channels.has(topic)) return channels.get(topic);
      const channel = {
        topic,
        opts,
        handlers: {},
        presence: {},
        statusCallback: null,
        on(type, filter, handler) {
          channel.handlers[`${type}:${filter.event}`] = handler;
          return channel;
        },
        subscribe(callback) {
          log.push(`subscribe:${topic}`);
          channel.statusCallback = callback;
          return channel;
        },
        track: vi.fn(async () => 'ok'),
        untrack: vi.fn(async () => 'ok'),
        presenceState: () => channel.presence,
        // test helpers
        status(status) {
          channel.statusCallback?.(status);
        },
        broadcast(event, payload) {
          channel.handlers[`broadcast:${event}`]?.({ payload });
        },
        sync(presence) {
          channel.presence = presence;
          channel.handlers['presence:sync']?.();
        },
      };
      channels.set(topic, channel);
      return channel;
    },
    getChannel: (topic) => channels.get(topic),
    removeChannel(channel) {
      client.removed.push(channel.topic);
      channels.delete(channel.topic);
    },
  };
  return client;
}

let client;
vi.mock('@/lib/supabase/browser', () => ({ createClient: () => client }));

import { PROJECT_EVENTS, RESYNC_EVENT, subscribeProjectTopics } from '@/lib/crm/projectRealtime';
import { touchesWorkspace, uniqueViewers, useProjectLive } from '@/components/crm/useProjectLive';

const SHARED = 'project:p1:shared';
const INTERNAL = 'project:p1:internal';
const flush = () => act(async () => {});

beforeEach(() => {
  client = fakeClient();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('subscribeProjectTopics', () => {
  it('authorizes the socket, then opens private channels bound to every project event', async () => {
    const off = subscribeProjectTopics(client, [SHARED, INTERNAL], { onEvent: () => {} });
    await flush();
    expect(client.log).toEqual(['setAuth', `subscribe:${SHARED}`, `subscribe:${INTERNAL}`]);
    const shared = client.getChannel(SHARED);
    expect(shared.opts).toEqual({ config: { private: true } });
    for (const event of PROJECT_EVENTS) expect(shared.handlers[`broadcast:${event}`]).toBeTypeOf('function');
    expect(shared.handlers['presence:sync']).toBeTypeOf('function');
    expect(client.getChannel(INTERNAL).handlers['presence:sync']).toBeUndefined();
    off();
  });

  it('two consumers share one channel; it is removed only when the last leaves', async () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribeProjectTopics(client, [SHARED], { onEvent: a });
    const offB = subscribeProjectTopics(client, [SHARED], { onEvent: b });
    await flush();
    expect(client.log.filter((entry) => entry.startsWith('subscribe:'))).toEqual([`subscribe:${SHARED}`]);

    client.getChannel(SHARED).broadcast('project_task_changed', { project_id: 'p1', task_id: 't1' });
    expect(a).toHaveBeenCalledWith('project_task_changed', { project_id: 'p1', task_id: 't1' }, SHARED);
    expect(b).toHaveBeenCalledTimes(1);

    offA();
    expect(client.removed).toEqual([]);
    client.getChannel(SHARED).broadcast('project_status_changed', { project_id: 'p1' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);

    offB();
    expect(client.removed).toEqual([SHARED]);
  });

  it('unsubscribing before auth resolves opens nothing', async () => {
    let resolveAuth;
    client.realtime.setAuth = () => new Promise((resolve) => { resolveAuth = resolve; });
    const off = subscribeProjectTopics(client, [SHARED], { onEvent: () => {} });
    off();
    await act(async () => { resolveAuth(); });
    expect(client.log).toEqual([]);
  });

  it('a failed auth leaves live updates off without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    client.realtime.setAuth = async () => { throw new Error('no session'); };
    const off = subscribeProjectTopics(client, [SHARED], { onEvent: () => {} });
    await flush();
    expect(client.log).toEqual([]);
    expect(warn).toHaveBeenCalled();
    off();
    warn.mockRestore();
  });

  it('a rejoin after a drop tells listeners to resync; the first join does not', async () => {
    const onEvent = vi.fn();
    const off = subscribeProjectTopics(client, [SHARED], { onEvent });
    await flush();
    const channel = client.getChannel(SHARED);
    channel.status('SUBSCRIBED');
    expect(onEvent).not.toHaveBeenCalled();
    channel.status('CHANNEL_ERROR');
    channel.status('SUBSCRIBED');
    expect(onEvent).toHaveBeenCalledWith(RESYNC_EVENT, {}, SHARED);
    off();
  });

  it('tracks presence once joined, again after a rejoin, and untracks when the tracker leaves', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const offThread = subscribeProjectTopics(client, [SHARED], { onEvent: () => {} });
    const offLive = subscribeProjectTopics(client, [SHARED], { presence: { userId: 'u1', name: 'Casey' } });
    await flush();
    const channel = client.getChannel(SHARED);
    expect(channel.track).not.toHaveBeenCalled();
    channel.status('SUBSCRIBED');
    expect(channel.track).toHaveBeenCalledWith({ userId: 'u1', name: 'Casey' });
    channel.status('TIMED_OUT');
    channel.status('SUBSCRIBED');
    expect(channel.track).toHaveBeenCalledTimes(2);

    offLive();
    expect(channel.untrack).toHaveBeenCalledTimes(1);
    expect(client.removed).toEqual([]);
    offThread();
    warn.mockRestore();
  });

  it('presence lists reach presence listeners', async () => {
    const onPresence = vi.fn();
    const off = subscribeProjectTopics(client, [SHARED], { onPresence });
    await flush();
    client.getChannel(SHARED).sync({ k1: [{ userId: 'u2', name: 'Ethan Ray' }] });
    expect(onPresence).toHaveBeenCalledWith([{ userId: 'u2', name: 'Ethan Ray' }]);
    off();
  });
});

describe('useProjectLive', () => {
  const CLIENT = { id: 'u1', role: 'client', full_name: 'Casey' };
  const PM = { id: 'u2', role: 'project_manager', full_name: 'Ethan Ray' };

  it('a client joins the shared topic only; staff join both', async () => {
    const { unmount } = renderHook(() => useProjectLive({ projectId: 'p1', profile: CLIENT, onChange: () => {} }));
    await flush();
    expect(client.log).toEqual(['setAuth', `subscribe:${SHARED}`]);
    unmount();

    client = fakeClient();
    renderHook(() => useProjectLive({ projectId: 'p1', profile: PM, onChange: () => {} }));
    await flush();
    expect(client.log).toEqual(['setAuth', `subscribe:${SHARED}`, `subscribe:${INTERNAL}`]);
  });

  it('batches a burst into one onChange and ignores other projects', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderHook(() => useProjectLive({ projectId: 'p1', profile: PM, onChange }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const shared = client.getChannel(SHARED);
    const internal = client.getChannel(INTERNAL);

    act(() => {
      shared.broadcast('project_status_changed', { project_id: 'p1' });
      internal.broadcast('project_status_changed', { project_id: 'p1' });
      internal.broadcast('project_task_changed', { project_id: 'p1', task_id: 't' });
      internal.broadcast('project_task_changed', { project_id: 'p2', task_id: 't' });
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(300); });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect([...onChange.mock.calls[0][0]].sort()).toEqual(['project_status_changed', 'project_task_changed']);
  });

  it('tracks the viewer by id and name, and lists the others once each', async () => {
    const { result } = renderHook(() => useProjectLive({ projectId: 'p1', profile: CLIENT, onChange: () => {} }));
    await flush();
    const shared = client.getChannel(SHARED);
    shared.status('SUBSCRIBED');
    expect(shared.track).toHaveBeenCalledWith({ userId: 'u1', name: 'Casey' });

    act(() => {
      shared.sync({
        a: [{ userId: 'u1', name: 'Casey' }],
        b: [{ userId: 'u2', name: 'Ethan Ray' }],
        c: [{ userId: 'u2', name: 'Ethan Ray' }],
      });
    });
    expect(result.current.viewers).toEqual([{ userId: 'u2', name: 'Ethan Ray' }]);
  });

  it('unmount leaves nothing open', async () => {
    const { unmount } = renderHook(() => useProjectLive({ projectId: 'p1', profile: PM, onChange: () => {} }));
    await flush();
    unmount();
    expect(client.removed.sort()).toEqual([INTERNAL, SHARED].sort());
  });
});

describe('helpers', () => {
  it('uniqueViewers drops the viewer, duplicates and blank entries', () => {
    expect(uniqueViewers([
      { userId: 'me', name: 'Me' },
      { userId: 'x', name: '  ' },
      { userId: 'x', name: 'Later' },
      { name: 'No id' },
      null,
    ], 'me')).toEqual([{ userId: 'x', name: 'Someone' }]);
  });

  it('touchesWorkspace is false for message-only bursts', () => {
    expect(touchesWorkspace(new Set(['project_message_created']))).toBe(false);
    expect(touchesWorkspace(new Set(['project_message_created', 'project_task_changed']))).toBe(true);
    expect(touchesWorkspace(new Set([RESYNC_EVENT]))).toBe(true);
  });
});
