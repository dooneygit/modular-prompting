// Content script — runs on supported AI chat platforms. Makes the chat input a
// drop target for prompt cards and (optionally) injects the in-page library
// panel. Unsupported sites are filtered out by the adapter registry.

import { getAdapterForCurrentSite } from "./platforms";
import { setupDropTarget } from "./dropHandler";
import { mountPanel, unmountPanel } from "./panel/mount";
import { useAppStore } from "../store/promptStore";
import { startStorageSync } from "../store/sync";

const adapter = getAdapterForCurrentSite();

if (adapter) {
  startStorageSync();
  setupDropTarget(adapter);

  let mounted: boolean | undefined;
  const apply = (enabled: boolean) => {
    if (enabled === mounted) return;
    mounted = enabled;
    // Defer so we never unmount the React root from inside its own event
    // handler (e.g. toggling the setting from within the panel).
    setTimeout(() => (enabled ? mountPanel(adapter) : unmountPanel()), 0);
  };

  const sync = () => apply(useAppStore.getState().inPagePanelEnabled);

  useAppStore.persist.rehydrate()?.then(sync);
  useAppStore.subscribe(sync);
}
