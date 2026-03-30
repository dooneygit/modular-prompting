import { useAppStore } from "../store/promptStore";
import { SideNavBar } from "./components/SideNavBar";
import { TopNavBar } from "./components/TopNavBar";
import { PromptBrowser } from "./components/PromptBrowser";
import { MasterPromptBox } from "./components/MasterPromptBox";
import { EditModal } from "./components/EditModal";

export default function App() {
  const editingPromptId = useAppStore((s) => s.editingPromptId);

  return (
    <div className="flex h-[562px] w-[800px] mx-auto border border-outline-variant/10 shadow-2xl overflow-hidden">
      <SideNavBar />
      <main className="flex-1 flex flex-col bg-surface min-w-0">
        <TopNavBar />
        <PromptBrowser />
      </main>
      <MasterPromptBox />
      {editingPromptId && <EditModal key={editingPromptId} />}
    </div>
  );
}
