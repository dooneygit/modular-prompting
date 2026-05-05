import { useAppStore } from "../../store/promptStore";
import { Icon } from "./Icon";

const VIEW_LABELS: Record<string, string> = {
  all: "All Prompts",
  recent: "All Prompts",
  favorites: "Favorites",
};

export function TopNavBar() {
  const { tabs, activeTabId, folders, setActiveTabId, closeTab, openNewTab } =
    useAppStore();

  return (
    <header className="flex items-center justify-between px-6 w-full h-14 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
      <div className="flex items-center gap-6 overflow-x-auto min-w-0">
        {tabs.map((tab) => {
          const label =
            VIEW_LABELS[tab.viewId] ??
            folders.find((f) => f.id === tab.viewId)?.name ??
            "Unknown";
          const isActive = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              className={`flex items-center gap-1.5 pb-4 mt-4 text-[13px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                isActive
                  ? "text-primary border-b-2 border-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{label}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-primary shrink-0">
        <button
          onClick={openNewTab}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
          title="New tab"
        >
          <Icon name="add" className="text-[20px]" />
        </button>
        <Icon
          name="help_outline"
          className="text-[20px] cursor-pointer hover:text-on-surface transition-colors"
        />
      </div>
    </header>
  );
}
