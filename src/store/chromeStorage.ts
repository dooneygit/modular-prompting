import type { StateStorage } from "zustand/middleware";
import type { LibraryData, Prompt } from "./promptStore";
import { buildItems, canonicalJson, parseItems } from "./syncItems";

export const STORAGE_KEY = "prompt-vault-storage";

// While we are applying a change received from another extension context
// (popup <-> content script), suppress the echo write so contexts don't
// ping-pong storage updates back and forth.
let applyingRemote = false;
export function setApplyingRemote(value: boolean): void {
  applyingRemote = value;
}

// Snapshots this context itself wrote. chrome.storage.onChanged also fires in
// the writing context, and rehydrating from such an echo overwrites state the
// user has changed since the write started (typing fast resets the editor
// textarea mid-keystroke, which sends the caret to the end).
const selfWrites = new Set<string>();
const MAX_TRACKED_SELF_WRITES = 20;

export function isSelfWrite(value: string): boolean {
  return selfWrites.delete(value);
}

// Sync items as this context last read or wrote them. Saves diff the store
// against this instead of live storage, so an item another device just added
// isn't mistaken for a local delete.
let baseline = new Map<string, string>();
let hasLoaded = false;
// Skips rebuilding the items on every editor keystroke.
let lastLibraryJson: string | null = null;

// Loads and saves run in order so a load never reads around an unfinished save.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

let saveFailed = false;
let saveFailedListener: (failed: boolean) => void = () => {};
export function setSaveFailedListener(
  listener: (failed: boolean) => void
): void {
  saveFailedListener = listener;
}

function reportSaveResult(failed: boolean): void {
  if (failed === saveFailed) return;
  saveFailed = failed;
  saveFailedListener(failed);
}

// Writes only what changed since the baseline. Not debounced: the popup can
// close at any moment, and library edits are discrete actions well under the
// sync write rate limit (keystrokes in the editor never reach this).
async function saveLibrary(library: LibraryData): Promise<void> {
  const next = buildItems(library);
  const changed: Record<string, unknown> = {};
  for (const [key, json] of next) {
    if (baseline.get(key) !== json) changed[key] = JSON.parse(json);
  }
  const removed = [...baseline.keys()].filter((key) => !next.has(key));

  // Set ahead of the writes because their onChanged echo can arrive first.
  const previous = baseline;
  baseline = next;
  try {
    // Removes first: when storage is full, the writes may need the freed space.
    if (removed.length > 0) await chrome.storage.sync.remove(removed);
    if (Object.keys(changed).length > 0) {
      await chrome.storage.sync.set(changed);
    }
    reportSaveResult(false);
  } catch {
    // Keeping the old baseline means the next save retries these changes.
    baseline = previous;
    reportSaveResult(true);
  }
}

export function loadLibrary(): Promise<LibraryData> {
  return enqueue(async () => {
    const library = parseItems(await chrome.storage.sync.get(null));
    baseline = buildItems(library);
    hasLoaded = true;
    lastLibraryJson = null;
    return library;
  });
}

export function isOwnLibraryChange(changes: {
  [key: string]: chrome.storage.StorageChange;
}): boolean {
  return Object.entries(changes).every(([key, { newValue }]) =>
    newValue === undefined
      ? !baseline.has(key)
      : baseline.get(key) === canonicalJson(newValue)
  );
}

interface PersistedValue {
  state: LibraryData & Record<string, unknown>;
  version?: number;
}

// Shared persistence so the popup and the in-page content script read/write the
// same data. The library lives in chrome.storage.sync to follow the user across
// devices; everything else is per-device state in chrome.storage.local.
export const chromeStorage: StateStorage = {
  getItem: async (name) => {
    const [result, library] = await Promise.all([
      chrome.storage.local.get(name),
      loadLibrary(),
    ]);
    const raw = result[name] as string | undefined;
    const { state, version } = (raw ? JSON.parse(raw) : { state: {} }) as {
      state: Record<string, unknown>;
      version?: number;
    };
    const { lastUsed = {}, ...deviceState } = state;
    const lastUsedById = lastUsed as Record<string, number>;
    return JSON.stringify({
      state: {
        ...deviceState,
        folders: library.folders,
        prompts: library.prompts.map(
          (p): Prompt =>
            lastUsedById[p.id] ? { ...p, lastUsedAt: lastUsedById[p.id] } : p
        ),
      },
      version,
    });
  },
  setItem: async (name, value) => {
    if (applyingRemote) return;
    const { state, version } = JSON.parse(value) as PersistedValue;
    const { folders, prompts, ...deviceState } = state;

    const libraryJson = JSON.stringify({ folders, prompts });
    // Before the first load this state is still the empty default, and saving
    // it would delete the synced library.
    if (hasLoaded && libraryJson !== lastLibraryJson) {
      lastLibraryJson = libraryJson;
      void enqueue(() => saveLibrary({ folders, prompts }));
    }

    const lastUsed = Object.fromEntries(
      prompts.flatMap((p) =>
        p.lastUsedAt === undefined ? [] : [[p.id, p.lastUsedAt]]
      )
    );
    const localValue = JSON.stringify({
      state: { ...deviceState, lastUsed },
      version,
    });
    selfWrites.add(localValue);
    if (selfWrites.size > MAX_TRACKED_SELF_WRITES) {
      const oldest = selfWrites.values().next().value as string;
      selfWrites.delete(oldest);
    }
    await chrome.storage.local.set({ [name]: localValue });
  },
  removeItem: async (name) => {
    await enqueue(async () => {
      await Promise.all([
        chrome.storage.local.remove(name),
        chrome.storage.sync.clear(),
      ]);
      baseline = new Map();
    });
  },
};

// One-time copy of existing popup localStorage data into chrome.storage.
// Runs in the popup context (the only place the old data lives).
export async function migrateLocalStorage(): Promise<void> {
  const existing = await chrome.storage.local.get(STORAGE_KEY);
  if (existing[STORAGE_KEY] != null) return;
  const old = localStorage.getItem(STORAGE_KEY);
  if (old != null) await chrome.storage.local.set({ [STORAGE_KEY]: old });
}
