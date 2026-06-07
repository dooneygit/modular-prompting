import { useAppStore } from "./promptStore";
import { STORAGE_KEY, setApplyingRemote } from "./chromeStorage";

// Keep this context's store in sync with changes made in other extension
// contexts (popup <-> content script) by rehydrating when storage changes.
export function startStorageSync(): void {
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local" || !changes[STORAGE_KEY]) return;
    setApplyingRemote(true);
    try {
      await useAppStore.persist.rehydrate();
    } finally {
      setApplyingRemote(false);
    }
  });
}
