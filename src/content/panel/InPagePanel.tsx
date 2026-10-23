import { useEffect, useRef, useState } from "react";
import { PromptBrowser } from "../../popup/components/PromptBrowser";
import { TopBar } from "../../popup/components/TopBar";
import { EditModal } from "../../popup/components/EditModal";
import { Icon } from "../../popup/components/Icon";
import { useAppStore } from "../../store/promptStore";
import { openFullscreenTab } from "../../popup/fullscreen";
import { layoutShift } from "../layout";
import type { PlatformAdapter } from "../platforms/types";

const MIN_PANEL = 320;
const MAX_PANEL = 800;

function defaultPanelWidth() {
  return window.innerWidth >= 1024 ? 500 : 460;
}

// Reuses the popup's library panes (top bar + prompt browser) docked against the
// right edge of the host page. Prompt cards are dragged from here onto the chat
// input; the drop is handled by the document-level drop target.
export function InPagePanel(_props: { adapter: PlatformAdapter }) {
  const [open, setOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(defaultPanelWidth);
  const editingPromptId = useAppStore((s) => s.editingPromptId);
  const panelResizeStartX = useRef<number | null>(null);

  // Push the host page's chat content left while the panel is open (tracking
  // resize), and restore it when collapsed or on unmount (extension disabled).
  useEffect(() => {
    if (open) layoutShift.apply(panelWidth);
    else layoutShift.restore();
    return () => layoutShift.restore();
  }, [open, panelWidth]);

  function handlePanelEdgeMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    panelResizeStartX.current = e.clientX;
    function onMouseMove(ev: MouseEvent) {
      if (panelResizeStartX.current === null) return;
      const delta = ev.clientX - panelResizeStartX.current;
      panelResizeStartX.current = ev.clientX;
      setPanelWidth((w) => Math.min(MAX_PANEL, Math.max(MIN_PANEL, w - delta)));
    }
    function onMouseUp() {
      panelResizeStartX.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open Quick Prompting"
        className="fixed right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-12 rounded-l-md bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-r-0 border-outline-variant/20"
      >
        <Icon name="chevron_left" className="text-[20px]" />
      </button>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 h-screen flex flex-col bg-surface text-on-surface border-l border-outline-variant/20 font-sans"
      style={{ width: panelWidth }}
    >
      {/* Left-edge resize handle — absolutely positioned so the content fills flush to the edge */}
      <div
        onMouseDown={handlePanelEdgeMouseDown}
        style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%", cursor: "col-resize", zIndex: 10 }}
      />
      <header className="flex items-center justify-between h-12 px-4 border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openFullscreenTab}
            title="Open in new tab"
            className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/20 hover:bg-surface-container-high transition-colors active:scale-[0.96]"
          >
            <Icon name="open_in_new" className="text-primary text-sm" />
          </button>
          <h1 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Quick Prompting
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Collapse"
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <Icon name="chevron_right" className="text-[20px]" />
        </button>
      </header>

      <main className="flex-1 flex flex-col min-h-0 bg-surface">
        <TopBar inPage />
        <PromptBrowser />
      </main>

      {editingPromptId && <EditModal key={editingPromptId} />}
    </div>
  );
}
