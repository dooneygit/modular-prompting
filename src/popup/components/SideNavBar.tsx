import { useAppStore } from "../../store/promptStore";
import { Icon } from "./Icon";
import { FolderTree } from "./FolderTree";

const NAV_ITEMS = [
  { id: "all", label: "All Prompts", icon: "folder_open" },
  { id: "favorites", label: "Favorites", icon: "star" },
  { id: "recent", label: "Recent", icon: "history" },
];

export function SideNavBar() {
  const { tabs, activeTabId, selectView, addFolder } = useAppStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <aside className="flex flex-col h-full py-6 px-4 bg-surface-container-low text-sm tracking-tight w-56 border-r border-outline-variant/20 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/20">
          <Icon name="terminal" className="text-primary text-sm" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-on-surface tracking-tighter">
            Prompt Library
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">
            Digital Curator
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
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
        <div className="pt-4 border-t border-outline-variant/10 space-y-0.5">
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
