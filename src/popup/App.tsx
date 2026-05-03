import { useState } from "react";
import { useAppStore } from "../store/promptStore";
import { SideNavBar } from "./components/SideNavBar";
import { TopNavBar } from "./components/TopNavBar";
import { PromptBrowser } from "./components/PromptBrowser";
import { MasterPromptBox } from "./components/MasterPromptBox";
import { EditModal } from "./components/EditModal";
import { PanelSplitter } from "./components/PanelSplitter";

const TOTAL_WIDTH = 800;
const MIN_PANEL = 120;

export default function App() {
  const editingPromptId = useAppStore((s) => s.editingPromptId);
  const [leftWidth, setLeftWidth] = useState(224);
  const [rightWidth, setRightWidth] = useState(288);

  function resizeLeft(delta: number) {
    setLeftWidth((w) => {
      const next = w + delta;
      const middleWidth = TOTAL_WIDTH - next - rightWidth;
      if (next < MIN_PANEL || middleWidth < MIN_PANEL) return w;
      return next;
    });
  }

  function resizeRight(delta: number) {
    setRightWidth((w) => {
      const next = w - delta;
      const middleWidth = TOTAL_WIDTH - leftWidth - next;
      if (next < MIN_PANEL || middleWidth < MIN_PANEL) return w;
      return next;
    });
  }

  return (
    <div className="flex h-[562px] w-[800px] mx-auto border border-outline-variant/10 shadow-2xl overflow-hidden">
      <SideNavBar width={leftWidth} />
      <PanelSplitter onResize={resizeLeft} />
      <main className="flex-1 flex flex-col bg-surface min-w-0">
        <TopNavBar />
        <PromptBrowser />
      </main>
      <PanelSplitter onResize={resizeRight} />
      <MasterPromptBox width={rightWidth} />
      {editingPromptId && <EditModal key={editingPromptId} />}
    </div>
  );
}
