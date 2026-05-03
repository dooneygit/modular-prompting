import { useEffect, useRef } from "react";
import { useAppStore } from "../../store/promptStore";
import { Icon } from "./Icon";
import { FolderTree } from "./FolderTree";

const NAV_ITEMS = [
  { id: "all", label: "All Prompts", icon: "folder_open" },
  { id: "favorites", label: "Favorites", icon: "star" },
  { id: "recent", label: "Recent", icon: "history" },
];

const SCROLL_EDGE_PX = 48;
const SCROLL_SPEED_PX = 8;

export function SideNavBar({ width }: { width: number }) {
  const { tabs, activeTabId, selectView, addFolder } = useAppStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const navRef = useRef<HTMLElement>(null);
  const scrollDirRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const stop = () => {
      scrollDirRef.current = 0;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const tick = () => {
      const dir = scrollDirRef.current;
      if (dir === 0 || !navRef.current) {
        rafRef.current = null;
        return;
      }
      navRef.current.scrollTop += dir * SCROLL_SPEED_PX;
      rafRef.current = requestAnimationFrame(tick);
    };

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("folder-id")) return;
      const rect = nav.getBoundingClientRect();
      if (e.clientY < rect.top + SCROLL_EDGE_PX) {
        scrollDirRef.current = -1;
      } else if (e.clientY > rect.bottom - SCROLL_EDGE_PX) {
        scrollDirRef.current = 1;
      } else {
        scrollDirRef.current = 0;
      }
      if (scrollDirRef.current !== 0 && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    nav.addEventListener("dragover", onDragOver, true);
    document.addEventListener("dragend", stop);
    document.addEventListener("drop", stop);
    return () => {
      nav.removeEventListener("dragover", onDragOver, true);
      document.removeEventListener("dragend", stop);
      document.removeEventListener("drop", stop);
      stop();
    };
  }, []);

  return (
    <aside className="flex flex-col h-full py-6 px-4 bg-surface-container-low text-sm tracking-tight border-r border-outline-variant/20 shrink-0" style={{ width }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/20">
          <Icon name="terminal" className="text-primary text-sm" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Quick prompting
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav ref={navRef} className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            onClick={() => selectView(item.id)}
            className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md transition-colors duration-200 active:scale-[0.98] ${
              activeTab?.viewId === item.id
                ? "bg-surface-container-high text-on-surface"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            } ${item.id === "recent" ? "mb-4" : ""}`}
          >
            <Icon name={item.icon} className="text-[20px]" />
            <span>{item.label}</span>
          </div>
        ))}

        {/* Folders Section */}
        <div className="pt-4 pb-12 border-t border-outline-variant/10 space-y-0.5">
          <p className="px-3 text-[10px] font-bold text-on-surface-variant/60 uppercase mb-2">
            Folders
          </p>
          <FolderTree />
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-outline-variant/10 space-y-1">
        <div
          onClick={() => addFolder("New Folder")}
          className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-200 flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md active:scale-[0.98]"
        >
          <Icon name="create_new_folder" className="text-[20px]" />
          <span>Add Folder</span>
        </div>
        <div className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-200 flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md active:scale-[0.98]">
          <Icon name="settings" className="text-[20px]" />
          <span>Settings</span>
        </div>
      </div>
    </aside>
  );
}
