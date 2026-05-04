import { useMemo } from "react";
import { useAppStore } from "../../store/promptStore";
import { Icon } from "./Icon";
import { PromptCard } from "./PromptCard";

export function PromptBrowser() {
  const {
    tabs,
    activeTabId,
    prompts,
    recentDrops,
    folders,
    setSearchQuery,
    addPrompt,
    setEditingPromptId,
  } = useAppStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeView = activeTab?.viewId ?? "all";
  const searchQuery = activeTab?.searchQuery ?? "";

  const filteredPrompts = useMemo(() => {
    let list = prompts;

    if (activeView === "all") {
      // show all
    } else if (activeView === "recent") {
      const promptMap = new Map(prompts.map((p) => [p.id, p]));
      list = recentDrops
        .map((id) => promptMap.get(id))
        .filter((p): p is typeof prompts[number] => p !== undefined);
    } else if (activeView === "favorites") {
      list = prompts.filter((p) => p.favorited);
    } else {
      list = prompts.filter((p) => p.folderId === activeView);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeView, prompts, recentDrops, searchQuery]);

  const activeFolder = folders.find((f) => f.id === activeView);
  const canAddPrompt = !!activeFolder;

  const handleNewPrompt = () => {
    const id = addPrompt("Untitled Prompt", "", activeView);
    setEditingPromptId(id);
  };

  return (
    <div className="p-4 flex-1 overflow-y-auto space-y-4">
      {/* Search */}
      <div className="relative">
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

      {/* New Prompt */}
      {canAddPrompt && (
        <button
          onClick={handleNewPrompt}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-md transition-colors border border-dashed border-outline-variant/30 hover:border-outline-variant/50"
        >
          <Icon name="add" className="text-[18px]" />
          <span>New Prompt</span>
        </button>
      )}

      {/* Prompt List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredPrompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} />
        ))}
      </div>

      {filteredPrompts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-on-surface-variant/50 text-sm">
            {searchQuery
              ? "No prompts match your search"
              : activeView === "favorites"
                ? "No favorite prompts yet"
                : activeView === "recent"
                  ? "No prompts dropped yet"
                  : "No prompts yet"}
          </p>
        </div>
      )}
    </div>
  );
}
