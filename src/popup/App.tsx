import { useEffect, useState } from "react";
import { useAppStore } from "../store/promptStore";
import { TopBar } from "./components/TopBar";
import { PromptBrowser } from "./components/PromptBrowser";
import { EditorBox } from "./components/EditorBox";
import { EditModal } from "./components/EditModal";
import { PanelSplitter } from "./components/PanelSplitter";
import { isFullscreenView } from "./fullscreen";

const POPUP_WIDTH = 800;
const MIN_PANEL = 120;
// The prompt list hosts the top bar, which needs room for its controls.
const MIN_MAIN = 360;
// Prompt list : editor = 60 : 40.
const EDITOR_SHARE = 0.4;

export default function App() {
  const editingPromptId = useAppStore((s) => s.editingPromptId);
  const storedRight = useAppStore((s) => s.rightPanelWidth);
  const setRightPanelWidth = useAppStore((s) => s.setRightPanelWidth);
  const editorOpen = useAppStore((s) => s.editorOpen);
  const toggleEditorOpen = useAppStore((s) => s.toggleEditorOpen);
  const fullscreen = isFullscreenView();
  const initialTotal = fullscreen ? window.innerWidth : POPUP_WIDTH;
  const [totalWidth, setTotalWidth] = useState(initialTotal);

  const defaultRight = Math.round(totalWidth * EDITOR_SHARE);

  // The stored width can come from a wider window (or from fullscreen while we
  // are now in the popup), so keep the prompt list from collapsing.
  function editorWidthFor(right: number | null) {
    return Math.min(
      right ?? defaultRight,
      Math.max(MIN_PANEL, totalWidth - MIN_MAIN)
    );
  }

  const rightWidth = editorWidthFor(storedRight);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z")
        return;
      // Leave native undo alone in other fields (search, edit modal, ...).
      const target = e.target as HTMLElement;
      const inOtherField =
        target.matches("input, textarea, [contenteditable]") &&
        target.dataset.nodeType !== "text";
      if (inOtherField) return;
      e.preventDefault();
      useAppStore.getState().undoEditor();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onResize = () => setTotalWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fullscreen]);

  // A drag registers its mousemove listener once, so this callback keeps the
  // width it was rendered with. Read the live store instead of the closure.
  function resizeRight(delta: number) {
    const right = editorWidthFor(useAppStore.getState().rightPanelWidth);
    const next = right - delta;
    if (next < MIN_PANEL || totalWidth - next < MIN_MAIN) return;
    setRightPanelWidth(next);
  }

  const containerClass = fullscreen
    ? "flex h-screen w-screen overflow-hidden"
    : "flex h-[562px] w-[800px] mx-auto border border-outline-variant/10 shadow-2xl overflow-hidden";

  return (
    <div className={containerClass}>
      <main className="flex-1 flex flex-col bg-surface min-w-0">
        <TopBar editorOpen={editorOpen} onToggleEditor={toggleEditorOpen} />
        <PromptBrowser />
      </main>
      {editorOpen && (
        <>
          <PanelSplitter onResize={resizeRight} />
          <EditorBox width={rightWidth} />
        </>
      )}
      {editingPromptId && <EditModal key={editingPromptId} />}
    </div>
  );
}
