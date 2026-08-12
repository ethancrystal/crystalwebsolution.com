// persistence.ts — optional, drop-in localStorage persistence for the slice.
//
// Make user-defined tools survive reloads with one call at store-creation time:
//
//   import { configureStore } from '@reduxjs/toolkit';
//   import toolSchemas from './toolSchemaSlice';
//   import { attachToolPersistence } from './persistence';
//
//   export const store = configureStore({ reducer: { toolSchemas } });
//   attachToolPersistence(store); // hydrates now + saves on every change
//
// It's deliberately framework-light: it only needs getState / subscribe /
// dispatch, so it also works with a Redux store created any other way.

import { importTools, selectTools } from './toolSchemaSlice';
import type { ToolSchemasState } from './toolSchemaSlice';
import type { ToolSchema } from './types';

const STORAGE_KEY = 'toolSchemas/v1';

interface MinimalStore {
  getState: () => { toolSchemas: ToolSchemasState };
  subscribe: (cb: () => void) => () => void;
  dispatch: (action: unknown) => unknown;
}

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** Read persisted tools, or undefined if none / unavailable / corrupt. */
export function loadPersistedTools(): ToolSchema[] | undefined {
  if (!storageAvailable()) return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { tools?: unknown };
    return Array.isArray(parsed.tools) ? (parsed.tools as ToolSchema[]) : undefined;
  } catch {
    return undefined;
  }
}

/** Write the current tools to localStorage (best-effort). */
export function savePersistedTools(tools: ToolSchema[]): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tools }));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

/**
 * Hydrate the store from localStorage, then persist on every change.
 * Returns an unsubscribe function. Saves are debounced so rapid edits don't
 * thrash localStorage.
 */
export function attachToolPersistence(store: MinimalStore, debounceMs = 250): () => void {
  const persisted = loadPersistedTools();
  if (persisted && persisted.length) store.dispatch(importTools(persisted));

  let last = selectTools(store.getState());
  let timer: ReturnType<typeof setTimeout> | undefined;

  return store.subscribe(() => {
    const tools = selectTools(store.getState());
    if (tools === last) return; // reference check — RTK gives a new array on change
    last = tools;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => savePersistedTools(tools), debounceMs);
  });
}
