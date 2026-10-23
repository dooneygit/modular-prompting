import { useAppStore } from "../../store/promptStore";
import { Icon } from "./Icon";
import { FolderDropdown } from "./FolderDropdown";
import { isFullscreenView, openFullscreenTab } from "../fullscreen";

interface TopBarProps {
  editorOpen?: boolean;
  onToggleEditor?: () => void;
  inPage?: boolean;
}

export function TopBar({ editorOpen, onToggleEditor, inPage }: TopBarProps) {
  const {
    tabs,
    activeTabId,
    folders,
    setSearchQuery,
    addPrompt,
    setEditingPromptId,
  } = useAppStore();
  const fullscreen = isFullscreenView();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeView = activeTab?.viewId ?? "all";
  const searchQuery = activeTab?.searchQuery ?? "";
  const canAddPrompt = folders.some((f) => f.id === activeView);

  const handleNewPrompt = () => {
    const id = addPrompt("Untitled Prompt", "", activeView);
    setEditingPromptId(id);
  };

  return (
    <header className="flex items-center gap-3 px-4 w-full h-14 bg-surface border-b border-outline-variant/10 shrink-0">
      <FolderDropdown />

      <div className="relative flex-1 min-w-0">
        <Icon
          name="search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm"
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-highest border-none rounded-sm py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-outline transition-all outline-none"
          placeholder="Search prompts..."
        />
      </div>

      <button
        type="button"
        onClick={handleNewPrompt}
        disabled={!canAddPrompt}
        title={canAddPrompt ? "New prompt" : "Select a folder to add a prompt"}
        className="flex items-center justify-center w-9 h-9 shrink-0 rounded-sm bg-surface-container-highest text-on-surface-variant enabled:hover:text-on-surface enabled:hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Icon name="add" className="text-[20px]" />
      </button>

      {!inPage && (
        <div className="flex items-center gap-4 pl-1 text-primary shrink-0">
          {!fullscreen && (
            <button
              type="button"
              onClick={openFullscreenTab}
              title="Open in new tab"
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Icon name="open_in_new" className="text-[20px]" />
            </button>
          )}
          {onToggleEditor && (
            <button
              type="button"
              onClick={onToggleEditor}
              className={`transition-colors ${editorOpen ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              title={editorOpen ? "Close editor" : "Open editor"}
            >
              <Icon name="edit" className="text-[20px]" />
            </button>
          )}
          <Icon
            name="help_outline"
            className="text-[20px] cursor-pointer hover:text-on-surface transition-colors"
          />
        </div>
      )}
    </header>
  );
}
