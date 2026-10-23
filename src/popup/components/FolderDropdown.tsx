import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/promptStore";
import { Icon } from "./Icon";
import { FolderTree } from "./FolderTree";

const NAV_ITEMS = [
  { id: "all", label: "All", icon: "apps" },
  { id: "favorites", label: "Favorites", icon: "star" },
];

const SCROLL_EDGE_PX = 48;
const SCROLL_SPEED_PX = 8;

// The side panel's folder list (views, folder tree, add folder) in a menu.
function FolderMenu() {
  const { tabs, activeTabId, selectView, addFolder } = useAppStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollDirRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Auto-scroll the list while a folder is dragged near its top or bottom edge.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const stop = () => {
      scrollDirRef.current = 0;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const tick = () => {
      const dir = scrollDirRef.current;
      if (dir === 0 || !listRef.current) {
        rafRef.current = null;
        return;
      }
      listRef.current.scrollTop += dir * SCROLL_SPEED_PX;
      rafRef.current = requestAnimationFrame(tick);
    };

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("folder-id")) return;
      const rect = list.getBoundingClientRect();
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

    list.addEventListener("dragover", onDragOver, true);
    document.addEventListener("dragend", stop);
    document.addEventListener("drop", stop);
    return () => {
      list.removeEventListener("dragover", onDragOver, true);
      document.removeEventListener("dragend", stop);
      document.removeEventListener("drop", stop);
      stop();
    };
  }, []);

  return (
    <div className="absolute left-0 top-full mt-1 z-40 w-64 max-h-[70vh] flex flex-col p-2 bg-surface-container-low text-sm tracking-tight border border-outline-variant/20 rounded-md shadow-2xl">
      <div ref={listRef} className="flex-1 min-h-0 flex flex-col space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            onClick={() => selectView(item.id)}
            className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md transition-colors duration-200 active:scale-[0.98] ${
              activeTab?.viewId === item.id
                ? "bg-surface-container-high text-on-surface"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <Icon name={item.icon} className="text-[20px]" />
            <span>{item.label}</span>
          </div>
        ))}

        <div className="pt-4 border-t border-outline-variant/10 space-y-0.5 flex-1 flex flex-col">
          <p className="px-3 text-[10px] font-bold text-on-surface-variant/60 uppercase mb-2">
            Folders
          </p>
          <FolderTree />
        </div>
      </div>

      <div className="pt-2 mt-1 border-t border-outline-variant/10">
        <div
          onClick={() => addFolder("New Folder")}
          className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-200 flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md active:scale-[0.98]"
        >
          <Icon name="create_new_folder" className="text-[20px]" />
          <span>Add Folder</span>
        </div>
      </div>
    </div>
  );
}

export function FolderDropdown() {
  const { tabs, activeTabId, folders } = useAppStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeView = tabs.find((t) => t.id === activeTabId)?.viewId ?? "all";
  const navItem = NAV_ITEMS.find((i) => i.id === activeView);
  const label =
    navItem?.label ??
    folders.find((f) => f.id === activeView)?.name ??
    "Unknown";

  // Switching views closes the menu. Clicking the already-active folder only
  // toggles its expansion, so the menu stays open for that.
  useEffect(() => {
    setOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (!open) return;
    // composedPath() sees into the in-page panel's shadow root, where the
    // event target is retargeted to the host element.
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0 max-w-[35%]"
      onKeyDown={(e) => {
        // Escape in the rename input only cancels the rename.
        if (e.key === "Escape" && (e.target as HTMLElement).tagName !== "INPUT") {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Switch folder"
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-sm text-sm transition-colors ${
          open
            ? "bg-surface-container-high text-on-surface"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
        }`}
      >
        <Icon name={navItem?.icon ?? "folder"} className="text-[18px]" />
        <span className="truncate">{label}</span>
        <Icon name={open ? "expand_less" : "expand_more"} className="text-[18px] ml-auto" />
      </button>
      {open && <FolderMenu />}
    </div>
  );
}
