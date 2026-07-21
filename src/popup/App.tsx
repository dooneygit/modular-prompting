import { useEffect, useState } from "react";
import { useAppStore } from "../store/promptStore";
import { SideNavBar } from "./components/SideNavBar";
import { TopNavBar } from "./components/TopNavBar";
import { PromptBrowser } from "./components/PromptBrowser";
import { EditorBox } from "./components/EditorBox";
import { EditModal } from "./components/EditModal";
import { PanelSplitter } from "./components/PanelSplitter";
import { isFullscreenView } from "./fullscreen";

const POPUP_WIDTH = 800;
const MIN_PANEL = 120;

export default function App() {
  const editingPromptId = useAppStore((s) => s.editingPromptId);
  const storedLeft = useAppStore((s) => s.leftPanelWidth);
  const storedRight = useAppStore((s) => s.rightPanelWidth);
  const setLeftPanelWidth = useAppStore((s) => s.setLeftPanelWidth);
  const setRightPanelWidth = useAppStore((s) => s.setRightPanelWidth);
  const editorOpen = useAppStore((s) => s.editorOpen);
  const toggleEditorOpen = useAppStore((s) => s.toggleEditorOpen);
  const fullscreen = isFullscreenView();
  const initialTotal = fullscreen ? window.innerWidth : POPUP_WIDTH;
  const [totalWidth, setTotalWidth] = useState(initialTotal);

  const defaultLeft = fullscreen ? Math.round(totalWidth / 6) : 224;
  const defaultRight = fullscreen ? Math.round(totalWidth / 3) : 288;

  // Stored widths can come from a wider window (or from fullscreen while we
  // are now in the popup), so keep the middle panel from collapsing.
  function widthsFor(left: number | null, right: number | null) {
    const l = Math.min(
      left ?? defaultLeft,
      Math.max(MIN_PANEL, totalWidth - 2 * MIN_PANEL)
    );
    const r = Math.min(
      right ?? defaultRight,
      Math.max(MIN_PANEL, totalWidth - l - MIN_PANEL)
    );
    return { left: l, right: r };
  }

  const { left: leftWidth, right: rightWidth } = widthsFor(
    storedLeft,
    storedRight
  );

  useEffect(() => {
    if (!fullscreen) return;
    const onResize = () => setTotalWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fullscreen]);

  // A drag registers its mousemove listener once, so these callbacks keep the
  // widths they were rendered with. Read the live store instead of the closure.
  function currentWidths() {
    const s = useAppStore.getState();
    return widthsFor(s.leftPanelWidth, s.rightPanelWidth);
  }

  function resizeLeft(delta: number) {
    const { left, right } = currentWidths();
    const next = left + delta;
    const middleWidth = totalWidth - next - right;
    if (next < MIN_PANEL || middleWidth < MIN_PANEL) return;
    setLeftPanelWidth(next);
  }

  function resizeRight(delta: number) {
    const { left, right } = currentWidths();
    const next = right - delta;
    const middleWidth = totalWidth - left - next;
    if (next < MIN_PANEL || middleWidth < MIN_PANEL) return;
    setRightPanelWidth(next);
  }

  const containerClass = fullscreen
    ? "flex h-screen w-screen overflow-hidden"
    : "flex h-[562px] w-[800px] mx-auto border border-outline-variant/10 shadow-2xl overflow-hidden";

  return (
    <div className={containerClass}>
      <SideNavBar width={leftWidth} />
      <PanelSplitter onResize={resizeLeft} />
      <main className="flex-1 flex flex-col bg-surface min-w-0">
        <TopNavBar editorOpen={editorOpen} onToggleEditor={toggleEditorOpen} />
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
