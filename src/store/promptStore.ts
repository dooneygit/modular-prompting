import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  folderId: string;
  createdAt: number;
  updatedAt: number;
  favorited: boolean;
}

export interface MasterBlock {
  id: string;
  promptId: string;
  title: string;
  content: string;
}

export interface Tab {
  id: string;
  viewId: string;
  searchQuery: string;
}

const INITIAL_TAB_ID = "default-tab";

interface AppState {
  folders: Folder[];
  prompts: Prompt[];
  masterBlocks: MasterBlock[];
  undoStack: MasterBlock[][];
  tabs: Tab[];
  activeTabId: string;
  editingPromptId: string | null;
  editingBlockId: string | null;
  renamingFolderId: string | null;

  addFolder: (name: string, parentId?: string | null) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, newParentId: string | null) => void;

  addPrompt: (title: string, content: string, folderId: string) => string;
  updatePrompt: (id: string, title: string, content: string) => void;
  deletePrompt: (id: string) => void;
  togglePromptFavorite: (id: string) => void;

  appendToMaster: (prompt: Prompt) => void;
  removeFromMaster: (blockId: string) => void;
  reorderMasterBlocks: (activeId: string, overId: string) => void;
  updateMasterBlock: (blockId: string, content: string) => void;
  undoMaster: () => void;
  clearMaster: () => void;

  selectView: (viewId: string) => void;
  openNewTab: () => void;
  setActiveTabId: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  setSearchQuery: (query: string) => void;
  setEditingPromptId: (id: string | null) => void;
  setEditingBlockId: (id: string | null) => void;
  setRenamingFolderId: (id: string | null) => void;
}

function getDescendantIds(folders: Folder[], parentId: string): string[] {
  const children = folders.filter((f) => f.parentId === parentId);
  return children.flatMap((c) => [c.id, ...getDescendantIds(folders, c.id)]);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      folders: [],
      prompts: [],
      masterBlocks: [],
      undoStack: [],
      tabs: [{ id: INITIAL_TAB_ID, viewId: "all", searchQuery: "" }],
      activeTabId: INITIAL_TAB_ID,
      editingPromptId: null,
      editingBlockId: null,
      renamingFolderId: null,

      addFolder: (name, parentId = null) => {
        const id = crypto.randomUUID();
        set((s) => ({
          folders: [...s.folders, { id, name, parentId }],
          renamingFolderId: id,
        }));
        return id;
      },

      renameFolder: (id, name) =>
        set((s) => ({
          folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
          renamingFolderId: null,
        })),

      deleteFolder: (id) => {
        const { folders } = get();
        const descendantIds = getDescendantIds(folders, id);
        const allIds = [id, ...descendantIds];
        set((s) => ({
          folders: s.folders.filter((f) => !allIds.includes(f.id)),
          prompts: s.prompts.filter((p) => !allIds.includes(p.folderId)),
          tabs: s.tabs.map((t) =>
            allIds.includes(t.viewId) ? { ...t, viewId: "all" } : t
          ),
        }));
      },

      moveFolder: (id, newParentId) => {
        const { folders } = get();
        if (newParentId) {
          const descendantIds = getDescendantIds(folders, id);
          if (descendantIds.includes(newParentId) || id === newParentId) return;
        }
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === id ? { ...f, parentId: newParentId } : f
          ),
        }));
      },

      addPrompt: (title, content, folderId) => {
        const id = crypto.randomUUID();
        set((s) => ({
          prompts: [
            ...s.prompts,
            {
              id,
              title,
              content,
              folderId,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              favorited: false,
            },
          ],
        }));
        return id;
      },

      updatePrompt: (id, title, content) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id
              ? { ...p, title, content, updatedAt: Date.now() }
              : p
          ),
          editingPromptId: null,
        })),

      deletePrompt: (id) =>
        set((s) => ({
          prompts: s.prompts.filter((p) => p.id !== id),
          masterBlocks: s.masterBlocks.filter((b) => b.promptId !== id),
        })),

      togglePromptFavorite: (id) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, favorited: !p.favorited } : p
          ),
        })),

      appendToMaster: (prompt) =>
        set((s) => ({
          undoStack: [...s.undoStack, s.masterBlocks].slice(-20),
          masterBlocks: [
            ...s.masterBlocks,
            {
              id: crypto.randomUUID(),
              promptId: prompt.id,
              title: prompt.title,
              content: prompt.content,
            },
          ],
        })),

      removeFromMaster: (blockId) =>
        set((s) => ({
          undoStack: [...s.undoStack, s.masterBlocks].slice(-20),
          masterBlocks: s.masterBlocks.filter((b) => b.id !== blockId),
        })),

      reorderMasterBlocks: (activeId, overId) =>
        set((s) => {
          const oldIndex = s.masterBlocks.findIndex((b) => b.id === activeId);
          const newIndex = s.masterBlocks.findIndex((b) => b.id === overId);
          if (oldIndex === -1 || newIndex === -1) return s;
          const blocks = [...s.masterBlocks];
          const [moved] = blocks.splice(oldIndex, 1);
          blocks.splice(newIndex, 0, moved);
          return {
            undoStack: [...s.undoStack, s.masterBlocks].slice(-20),
            masterBlocks: blocks,
          };
        }),

      updateMasterBlock: (blockId, content) =>
        set((s) => ({
          masterBlocks: s.masterBlocks.map((b) =>
            b.id === blockId ? { ...b, content } : b
          ),
          editingBlockId: null,
        })),

      undoMaster: () =>
        set((s) => {
          if (s.undoStack.length === 0) return s;
          const prev = s.undoStack[s.undoStack.length - 1];
          return {
            masterBlocks: prev,
            undoStack: s.undoStack.slice(0, -1),
          };
        }),

      clearMaster: () =>
        set((s) => {
          if (s.masterBlocks.length === 0) return s;
          return {
            undoStack: [...s.undoStack, s.masterBlocks].slice(-20),
            masterBlocks: [],
          };
        }),

      selectView: (viewId) =>
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === s.activeTabId
              ? { ...t, viewId, searchQuery: "" }
              : t
          ),
        })),

      openNewTab: () => {
        const id = crypto.randomUUID();
        set((s) => ({
          tabs: [...s.tabs, { id, viewId: "all", searchQuery: "" }],
          activeTabId: id,
        }));
      },

      setActiveTabId: (tabId) => set({ activeTabId: tabId }),

      closeTab: (tabId) =>
        set((s) => {
          if (s.tabs.length <= 1) return s;
          const idx = s.tabs.findIndex((t) => t.id === tabId);
          const remaining = s.tabs.filter((t) => t.id !== tabId);
          const newActiveTabId =
            s.activeTabId === tabId
              ? remaining[Math.max(0, idx - 1)]?.id ?? remaining[0].id
              : s.activeTabId;
          return { tabs: remaining, activeTabId: newActiveTabId };
        }),

      setSearchQuery: (query) =>
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === s.activeTabId ? { ...t, searchQuery: query } : t
          ),
        })),

      setEditingPromptId: (id) => set({ editingPromptId: id }),
      setEditingBlockId: (id) => set({ editingBlockId: id }),
      setRenamingFolderId: (id) => set({ renamingFolderId: id }),
    }),
    {
      name: "prompt-vault-storage",
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          const old = persistedState as Record<string, unknown>;
          const initialTabId = crypto.randomUUID();
          const rawPrompts = (old.prompts ?? []) as Prompt[];
          return {
            folders: old.folders ?? [],
            prompts: rawPrompts.map((p) => ({
              ...p,
              favorited: p.favorited ?? false,
            })),
            masterBlocks: old.masterBlocks ?? [],
            tabs: [
              {
                id: initialTabId,
                viewId:
                  typeof old.activeView === "string" ? old.activeView : "all",
                searchQuery: "",
              },
            ],
            activeTabId: initialTabId,
          };
        }
        if (version === 1) {
          const s = persistedState as { prompts?: Prompt[] };
          const prompts = s.prompts ?? [];
          return {
            ...(persistedState as object),
            prompts: prompts.map((p) => ({
              ...p,
              favorited: p.favorited ?? false,
            })),
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        folders: state.folders,
        prompts: state.prompts,
        masterBlocks: state.masterBlocks,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
