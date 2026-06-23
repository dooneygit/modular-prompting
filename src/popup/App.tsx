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
  const fullscreen = isFullscreenView();
  const initialTotal = fullscreen ? window.innerWidth : POPUP_WIDTH;
  const [leftWidth, setLeftWidth] = useState(
    fullscreen ? Math.round(initialTotal / 6) : 224
  );
  const [rightWidth, setRightWidth] = useState(
    fullscreen ? Math.round(initialTotal / 3) : 288
  );
  const [totalWidth, setTotalWidth] = useState(initialTotal);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const onResize = () => setTotalWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fullscreen]);

  function resizeLeft(delta: number) {
    setLeftWidth((w) => {
      const next = w + delta;
      const middleWidth = totalWidth - next - rightWidth;
      if (next < MIN_PANEL || middleWidth < MIN_PANEL) return w;
      return next;
    });
  }

  function resizeRight(delta: number) {
    setRightWidth((w) => {
      const next = w - delta;
      const middleWidth = totalWidth - leftWidth - next;
      if (next < MIN_PANEL || middleWidth < MIN_PANEL) return w;
      return next;
    });
  }

  const containerClass = fullscreen
    ? "flex h-screen w-screen overflow-hidden"
    : "flex h-[562px] w-[800px] mx-auto border border-outline-variant/10 shadow-2xl overflow-hidden";

  return (
    <div className={containerClass}>
      <SideNavBar width={leftWidth} />
      <PanelSplitter onResize={resizeLeft} />
      <main className="flex-1 flex flex-col bg-surface min-w-0">
        <TopNavBar editorOpen={editorOpen} onToggleEditor={() => setEditorOpen((o) => !o)} />
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
