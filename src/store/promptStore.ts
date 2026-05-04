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

export interface MasterTextNode {
  type: "text";
  id: string;
  content: string;
}

export type MasterNode = MasterTextNode;

export interface Tab {
  id: string;
  viewId: string;
  searchQuery: string;
}

function normalizeNodes(nodes: MasterNode[]): MasterNode[] {
  if (nodes.length === 0) {
    return [{ type: "text", id: crypto.randomUUID(), content: "" }];
  }
  const content = nodes.map((n) => n.content).join("");
  return [{ type: "text", id: nodes[0].id, content }];
}

const INITIAL_TAB_ID = "default-tab";

interface AppState {
  folders: Folder[];
  prompts: Prompt[];
  recentDrops: string[];
  masterNodes: MasterNode[];
  undoStack: MasterNode[][];
  tabs: Tab[];
  activeTabId: string;
  editingPromptId: string | null;
  renamingFolderId: string | null;

  addFolder: (name: string, parentId?: string | null) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, newParentId: string | null) => void;

  addPrompt: (title: string, content: string, folderId: string) => string;
  updatePrompt: (id: string, title: string, content: string) => void;
  deletePrompt: (id: string) => void;
  togglePromptFavorite: (id: string) => void;
  recordDrop: (promptId: string) => void;

  insertContentAtOffset: (charOffset: number, content: string) => void;
  updateTextNode: (nodeId: string, content: string) => void;
  undoMaster: () => void;
  clearMaster: () => void;

  selectView: (viewId: string) => void;
  openNewTab: () => void;
  setActiveTabId: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  setSearchQuery: (query: string) => void;
  setEditingPromptId: (id: string | null) => void;
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
      recentDrops: [],
      masterNodes: [],
      undoStack: [],
      tabs: [{ id: INITIAL_TAB_ID, viewId: "recent", searchQuery: "" }],
      activeTabId: INITIAL_TAB_ID,
      editingPromptId: null,
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
        set((s) => {
          const deletedPromptIds = new Set(
            s.prompts.filter((p) => allIds.includes(p.folderId)).map((p) => p.id)
          );
          return {
            folders: s.folders.filter((f) => !allIds.includes(f.id)),
            prompts: s.prompts.filter((p) => !allIds.includes(p.folderId)),
            recentDrops: s.recentDrops.filter((rid) => !deletedPromptIds.has(rid)),
            tabs: s.tabs.map((t) =>
              allIds.includes(t.viewId) ? { ...t, viewId: "recent" } : t
            ),
          };
        });
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
          recentDrops: s.recentDrops.filter((rid) => rid !== id),
        })),

      recordDrop: (promptId) =>
        set((s) => ({
          recentDrops: [
            promptId,
            ...s.recentDrops.filter((id) => id !== promptId),
          ].slice(0, 20),
        })),

      togglePromptFavorite: (id) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, favorited: !p.favorited } : p
          ),
        })),

      insertContentAtOffset: (charOffset, content) =>
        set((s) => {
          const node = s.masterNodes[0];
          if (!node) return s;
          const safe = Math.min(Math.max(charOffset, 0), node.content.length);
          const newContent =
            node.content.slice(0, safe) + content + node.content.slice(safe);
          return {
            undoStack: [...s.undoStack, s.masterNodes].slice(-20),
            masterNodes: [{ ...node, content: newContent }],
          };
        }),

      updateTextNode: (nodeId, content) =>
        set((s) => ({
          masterNodes: s.masterNodes.map((n) =>
            n.id === nodeId ? { ...n, content } : n
          ),
        })),

      undoMaster: () =>
        set((s) => {
          if (s.undoStack.length === 0) return s;
          const prev = s.undoStack[s.undoStack.length - 1];
          return {
            masterNodes: normalizeNodes(prev),
            undoStack: s.undoStack.slice(0, -1),
          };
        }),

      clearMaster: () =>
        set((s) => {
          const hasContent = s.masterNodes.some((n) => n.content.length > 0);
          if (!hasContent) return s;
          return {
            undoStack: [...s.undoStack, s.masterNodes].slice(-20),
            masterNodes: normalizeNodes([]),
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
          tabs: [...s.tabs, { id, viewId: "recent", searchQuery: "" }],
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
      setRenamingFolderId: (id) => set({ renamingFolderId: id }),
    }),
    {
      name: "prompt-vault-storage",
      version: 5,
      migrate: (persistedState: unknown, version: number) => {
        let state = persistedState as Record<string, unknown>;

        if (version < 1) {
          const initialTabId = crypto.randomUUID();
          const rawPrompts = (state.prompts ?? []) as Prompt[];
          state = {
            ...state,
            prompts: rawPrompts.map((p) => ({
              ...p,
              favorited: p.favorited ?? false,
            })),
            tabs: [
              {
                id: initialTabId,
                viewId:
                  typeof state.activeView === "string"
                    ? state.activeView
                    : "recent",
                searchQuery: "",
              },
            ],
            activeTabId: initialTabId,
          };
        }

        if (version < 2) {
          const prompts = (state.prompts ?? []) as Prompt[];
          state = {
            ...state,
            prompts: prompts.map((p) => ({
              ...p,
              favorited: p.favorited ?? false,
            })),
          };
        }

        if (version < 3) {
          interface OldBlock {
            id: string;
            promptId: string;
            title: string;
            content: string;
          }
          const oldBlocks = (state.masterBlocks ?? []) as OldBlock[];
          state = {
            ...state,
            masterNodes: oldBlocks.map((b) => ({
              type: "text" as const,
              id: b.id,
              content: b.content,
            })),
          };
        }

        if (version < 4) {
          const oldNodes = (state.masterNodes ?? []) as Array<{
            type: string;
            id: string;
            content?: string;
          }>;
          const parts = oldNodes
            .map((n) => (n.content ?? "").trim())
            .filter(Boolean);
          state = {
            ...state,
            masterNodes: [
              {
                type: "text" as const,
                id: crypto.randomUUID(),
                content: parts.join("\n\n"),
              },
            ],
          };
        }

        if (version < 5) {
          state = { ...state, recentDrops: [] };
        }

        return state;
      },
      partialize: (state) => ({
        folders: state.folders,
        prompts: state.prompts,
        recentDrops: state.recentDrops,
        masterNodes: state.masterNodes,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
