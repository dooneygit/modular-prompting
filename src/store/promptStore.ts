import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { chromeStorage, STORAGE_KEY } from "./chromeStorage";

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
  lastUsedAt?: number;
  favorited: boolean;
}

export interface EditorTextNode {
  type: "text";
  id: string;
  content: string;
}

export type EditorNode = EditorTextNode;

export interface Tab {
  id: string;
  viewId: string;
  searchQuery: string;
}

function normalizeNodes(nodes: EditorNode[]): EditorNode[] {
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
  editorNodes: EditorNode[];
  undoStack: EditorNode[][];
  tabs: Tab[];
  activeTabId: string;
  editingPromptId: string | null;
  renamingFolderId: string | null;
  inPagePanelEnabled: boolean;

  addFolder: (name: string, parentId?: string | null) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (
    id: string,
    newParentId: string | null,
    rootIndex?: number
  ) => void;

  addPrompt: (title: string, content: string, folderId: string) => string;
  updatePrompt: (id: string, title: string, content: string) => void;
  deletePrompt: (id: string) => void;
  togglePromptFavorite: (id: string) => void;
  touchPrompt: (id: string) => void;

  insertContentAtOffset: (charOffset: number, content: string) => void;
  updateTextNode: (nodeId: string, content: string) => void;
  undoEditor: () => void;
  clearEditor: () => void;

  selectView: (viewId: string) => void;
  openNewTab: () => void;
  setActiveTabId: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  setSearchQuery: (query: string) => void;
  setEditingPromptId: (id: string | null) => void;
  setRenamingFolderId: (id: string | null) => void;
  toggleInPagePanel: () => void;
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
      editorNodes: normalizeNodes([]),
      undoStack: [],
      tabs: [{ id: INITIAL_TAB_ID, viewId: "all", searchQuery: "" }],
      activeTabId: INITIAL_TAB_ID,
      editingPromptId: null,
      renamingFolderId: null,
      inPagePanelEnabled: true,

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

      moveFolder: (id, newParentId, rootIndex) => {
        const { folders } = get();
        if (newParentId) {
          const descendantIds = getDescendantIds(folders, id);
          if (descendantIds.includes(newParentId) || id === newParentId) return;
        }
        set((s) => {
          const moved = s.folders.map((f) =>
            f.id === id ? { ...f, parentId: newParentId } : f
          );
          if (newParentId !== null || rootIndex === undefined) {
            return { folders: moved };
          }
          // Sibling order is array order, so reposition the folder among the
          // root entries. rootIndex is a slot in the pre-move root list.
          const rootIds = s.folders
            .filter((f) => f.parentId === null)
            .map((f) => f.id);
          const from = rootIds.indexOf(id);
          let to = rootIndex;
          if (from !== -1) {
            rootIds.splice(from, 1);
            if (from < rootIndex) to -= 1;
          }
          rootIds.splice(to, 0, id);
          const byId = new Map(moved.map((f) => [f.id, f]));
          return {
            folders: [
              ...rootIds.map((rid) => byId.get(rid)!),
              ...moved.filter((f) => f.parentId !== null),
            ],
          };
        });
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
        })),

      togglePromptFavorite: (id) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, favorited: !p.favorited } : p
          ),
        })),

      touchPrompt: (id) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, lastUsedAt: Date.now() } : p
          ),
        })),

      insertContentAtOffset: (charOffset, content) =>
        set((s) => {
          const node = s.editorNodes[0] ?? normalizeNodes([])[0];
          const safe = Math.min(Math.max(charOffset, 0), node.content.length);
          const newContent =
            node.content.slice(0, safe) + content + node.content.slice(safe);
          return {
            undoStack: [...s.undoStack, s.editorNodes].slice(-20),
            editorNodes: [{ ...node, content: newContent }],
          };
        }),

      updateTextNode: (nodeId, content) =>
        set((s) => ({
          editorNodes: s.editorNodes.map((n) =>
            n.id === nodeId ? { ...n, content } : n
          ),
        })),

      undoEditor: () =>
        set((s) => {
          if (s.undoStack.length === 0) return s;
          const prev = s.undoStack[s.undoStack.length - 1];
          return {
            editorNodes: normalizeNodes(prev),
            undoStack: s.undoStack.slice(0, -1),
          };
        }),

      clearEditor: () =>
        set((s) => {
          const hasContent = s.editorNodes.some((n) => n.content.length > 0);
          if (!hasContent) return s;
          return {
            undoStack: [...s.undoStack, s.editorNodes].slice(-20),
            editorNodes: normalizeNodes([]),
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
      setRenamingFolderId: (id) => set({ renamingFolderId: id }),

      toggleInPagePanel: () =>
        set((s) => ({ inPagePanelEnabled: !s.inPagePanelEnabled })),
    }),
    {
      name: STORAGE_KEY,
      version: 6,
      storage: createJSONStorage(() => chromeStorage),
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
          const tabs = (state.tabs ?? []) as Tab[];
          state = {
            ...state,
            tabs: tabs.map((t) =>
              t.viewId === "recent" ? { ...t, viewId: "all" } : t
            ),
          };
        }

        if (version < 6) {
          state = {
            ...state,
            editorNodes: state.masterNodes,
            masterNodes: undefined,
          };
        }

        return state;
      },
      partialize: (state) => ({
        folders: state.folders,
        prompts: state.prompts,
        editorNodes: state.editorNodes,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        inPagePanelEnabled: state.inPagePanelEnabled,
      }),
    }
  )
);
