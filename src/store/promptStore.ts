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
}

export interface MasterBlock {
  id: string;
  promptId: string;
  title: string;
  content: string;
}

interface AppState {
  folders: Folder[];
  prompts: Prompt[];
  masterBlocks: MasterBlock[];
  undoStack: MasterBlock[][];
  activeView: string;
  openTabIds: string[];
  searchQuery: string;
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

  appendToMaster: (prompt: Prompt) => void;
  removeFromMaster: (blockId: string) => void;
  reorderMasterBlocks: (activeId: string, overId: string) => void;
  updateMasterBlock: (blockId: string, content: string) => void;
  undoMaster: () => void;
  clearMaster: () => void;

  selectView: (viewId: string) => void;
  openTab: (tabId: string) => void;
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
      activeView: "all",
      openTabIds: [],
      searchQuery: "",
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
          openTabIds: s.openTabIds.filter((t) => !allIds.includes(t)),
          activeView: allIds.includes(s.activeView) ? "all" : s.activeView,
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
          const oldIndex = s.masterBlocks.findIndex(
            (b) => b.id === activeId
          );
          const newIndex = s.masterBlocks.findIndex(
            (b) => b.id === overId
          );
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

      selectView: (viewId) => {
        const { folders, openTabIds } = get();
        const isFolder = folders.some((f) => f.id === viewId);
        if (isFolder && !openTabIds.includes(viewId)) {
          set((s) => ({
            activeView: viewId,
            openTabIds: [...s.openTabIds, viewId],
            searchQuery: "",
          }));
        } else {
          set({ activeView: viewId, searchQuery: "" });
        }
      },

      openTab: (tabId) =>
        set((s) => ({
          openTabIds: s.openTabIds.includes(tabId)
            ? s.openTabIds
            : [...s.openTabIds, tabId],
          activeView: tabId,
        })),

      closeTab: (tabId) =>
        set((s) => {
          const remaining = s.openTabIds.filter((t) => t !== tabId);
          return {
            openTabIds: remaining,
            activeView:
              s.activeView === tabId
                ? remaining.length > 0
                  ? remaining[remaining.length - 1]
                  : "all"
                : s.activeView,
          };
        }),

      setSearchQuery: (query) => set({ searchQuery: query }),
      setEditingPromptId: (id) => set({ editingPromptId: id }),
      setEditingBlockId: (id) => set({ editingBlockId: id }),
      setRenamingFolderId: (id) => set({ renamingFolderId: id }),
    }),
    {
      name: "prompt-vault-storage",
      partialize: (state) => ({
        folders: state.folders,
        prompts: state.prompts,
        masterBlocks: state.masterBlocks,
        openTabIds: state.openTabIds,
        activeView: state.activeView,
      }),
    }
  )
);
