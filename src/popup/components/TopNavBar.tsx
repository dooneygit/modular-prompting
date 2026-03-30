import { useAppStore } from "../../store/promptStore";
import { Icon } from "./Icon";

export function TopNavBar() {
  const { openTabIds, activeView, folders, selectView, closeTab } =
    useAppStore();

  return (
    <header className="flex items-center justify-between px-6 w-full h-14 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
      <div className="flex items-center gap-6 overflow-x-auto min-w-0">
        {openTabIds.map((tabId) => {
          const folder = folders.find((f) => f.id === tabId);
          if (!folder) return null;
          const isActive = activeView === tabId;
          return (
            <div
              key={tabId}
              className={`flex items-center gap-1.5 pb-4 mt-4 text-[13px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                isActive
                  ? "text-primary border-b-2 border-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              onClick={() => selectView(tabId)}
            >
              <span>{folder.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tabId);
                }}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <Icon name="close" className="text-[14px]" />
              </button>
            </div>
          );
        })}
        {openTabIds.length === 0 && (
          <span className="text-[13px] text-on-surface-variant/50 italic pb-4 mt-4">
            Open a folder to begin
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-primary shrink-0">
        <Icon
          name="help_outline"
          className="text-[20px] cursor-pointer hover:text-on-surface transition-colors"
        />
      </div>
    </header>
  );
}
