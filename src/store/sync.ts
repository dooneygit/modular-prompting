import { useAppStore } from "./promptStore";
import {
  STORAGE_KEY,
  isOwnLibraryChange,
  isSelfWrite,
  loadLibrary,
  setApplyingRemote,
  setSaveFailedListener,
} from "./chromeStorage";

// Only the library is replaced: a full rehydrate here would also reset the
// editor, moving the caret while the user types during a sync from elsewhere.
async function applyLibraryChange(): Promise<void> {
  const { folders, prompts } = await loadLibrary();
  setApplyingRemote(true);
  useAppStore.setState((s) => {
    const lastUsed = new Map(s.prompts.map((p) => [p.id, p.lastUsedAt]));
    const folderIds = new Set(folders.map((f) => f.id));
    const removedIds = new Set(
      s.folders.filter((f) => !folderIds.has(f.id)).map((f) => f.id)
    );
    return {
      folders,
      prompts: prompts.map((p) => ({ ...p, lastUsedAt: lastUsed.get(p.id) })),
      tabs: s.tabs.map((t) =>
        removedIds.has(t.viewId) ? { ...t, viewId: "all" } : t
      ),
    };
  });
  setApplyingRemote(false);
}

// Keep this context's store in sync with changes made in other extension
// contexts (popup <-> content script) and on the user's other devices.
export function startStorageSync(): void {
  setSaveFailedListener((saveFailed) => useAppStore.setState({ saveFailed }));
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === "sync") {
      if (!isOwnLibraryChange(changes)) await applyLibraryChange();
      return;
    }
    if (area !== "local" || !changes[STORAGE_KEY]) return;
    const newValue = changes[STORAGE_KEY].newValue;
    // Ignore the echo of our own write: we already hold that state or newer.
    if (typeof newValue === "string" && isSelfWrite(newValue)) return;
    setApplyingRemote(true);
    try {
      await useAppStore.persist.rehydrate();
    } finally {
      setApplyingRemote(false);
    }
  });
}
