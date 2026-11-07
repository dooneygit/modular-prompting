import type { StateStorage } from "zustand/middleware";

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

// Shared persistence backed by chrome.storage.local so the popup and the
// in-page content script read/write the same data.
export const chromeStorage: StateStorage = {
  getItem: async (name) => {
    const result = await chrome.storage.local.get(name);
    return (result[name] as string | undefined) ?? null;
  },
  setItem: async (name, value) => {
    if (applyingRemote) return;
    selfWrites.add(value);
    if (selfWrites.size > MAX_TRACKED_SELF_WRITES) {
      const oldest = selfWrites.values().next().value as string;
      selfWrites.delete(oldest);
    }
    await chrome.storage.local.set({ [name]: value });
  },
  removeItem: async (name) => {
    await chrome.storage.local.remove(name);
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
