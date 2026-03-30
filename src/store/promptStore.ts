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

export interface MasterPromptNode {
  type: "prompt";
  id: string;
  promptId: string;
  header: string;
  content: string;
  expanded: boolean;
}

export type MasterNode = MasterTextNode | MasterPromptNode;

export interface Tab {
  id: string;
  viewId: string;
  searchQuery: string;
}

function normalizeNodes(nodes: MasterNode[]): MasterNode[] {
  if (nodes.length === 0) {
    return [{ type: "text", id: crypto.randomUUID(), content: "" }];
  }

  const result: MasterNode[] = [];

  for (const node of nodes) {
    const last = result[result.length - 1];

    if (node.type === "text" && last?.type === "text") {
      result[result.length - 1] = {
        ...last,
        content: last.content + node.content,
      };
    } else if (node.type === "prompt" && last?.type === "prompt") {
      result.push({ type: "text", id: crypto.randomUUID(), content: "" });
      result.push(node);
    } else {
      result.push(node);
    }
  }

  if (result[0]?.type === "prompt") {
    result.unshift({ type: "text", id: crypto.randomUUID(), content: "" });
  }

  if (result[result.length - 1]?.type === "prompt") {
    result.push({ type: "text", id: crypto.randomUUID(), content: "" });
  }

  return result;
}

const INITIAL_TAB_ID = "default-tab";

interface AppState {
  folders: Folder[];
  prompts: Prompt[];
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

  insertPromptNode: (
    index: number,
    promptId: string,
    header: string,
    content: string
  ) => void;
  splitTextAndInsertPrompt: (
    textNodeId: string,
    charOffset: number,
    promptId: string,
    header: string,
    content: string
  ) => void;
  movePromptNode: (
    sourceNodeId: string,
    target:
      | { type: "gap"; index: number }
      | { type: "text-split"; textNodeId: string; charOffset: number }
  ) => void;
  updateTextNode: (nodeId: string, content: string) => void;
  updatePromptNodeContent: (nodeId: string, content: string) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  removeNode: (nodeId: string) => void;
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
      masterNodes: [],
      undoStack: [],
      tabs: [{ id: INITIAL_TAB_ID, viewId: "all", searchQuery: "" }],
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
          masterNodes: normalizeNodes(
            s.masterNodes.filter(
              (n) => !(n.type === "prompt" && n.promptId === id)
            )
          ),
        })),

      togglePromptFavorite: (id) =>
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, favorited: !p.favorited } : p
          ),
        })),

      insertPromptNode: (index, promptId, header, content) =>
        set((s) => {
          const node: MasterPromptNode = {
            type: "prompt",
            id: crypto.randomUUID(),
            promptId,
            header,
            content,
            expanded: false,
          };
          const next = [...s.masterNodes];
          next.splice(index, 0, node);
          return {
            undoStack: [...s.undoStack, s.masterNodes].slice(-20),
            masterNodes: normalizeNodes(next),
          };
        }),

      splitTextAndInsertPrompt: (
        textNodeId,
        charOffset,
        promptId,
        header,
        content
      ) =>
        set((s) => {
          const idx = s.masterNodes.findIndex((n) => n.id === textNodeId);
          if (idx === -1) return s;
          const target = s.masterNodes[idx];
          if (target.type !== "text") return s;

          const before: MasterTextNode = {
            type: "text",
            id: crypto.randomUUID(),
            content: target.content.slice(0, charOffset),
          };
          const prompt: MasterPromptNode = {
            type: "prompt",
            id: crypto.randomUUID(),
            promptId,
            header,
            content,
            expanded: false,
          };
          const after: MasterTextNode = {
            type: "text",
            id: crypto.randomUUID(),
            content: target.content.slice(charOffset),
          };

          const next = [...s.masterNodes];
          next.splice(idx, 1, before, prompt, after);

          return {
            undoStack: [...s.undoStack, s.masterNodes].slice(-20),
            masterNodes: normalizeNodes(next),
          };
        }),

      movePromptNode: (sourceNodeId, target) =>
        set((s) => {
          const sourceIdx = s.masterNodes.findIndex(
            (n) => n.id === sourceNodeId
          );
          if (sourceIdx === -1) return s;
          const sourceNode = s.masterNodes[sourceIdx];
          if (sourceNode.type !== "prompt") return s;

          const without = [...s.masterNodes];
          without.splice(sourceIdx, 1);

          if (target.type === "gap") {
            let idx = target.index;
            if (sourceIdx < idx) idx--;
            without.splice(idx, 0, sourceNode);
          } else {
            const textIdx = without.findIndex(
              (n) => n.id === target.textNodeId
            );
            if (textIdx === -1 || without[textIdx].type !== "text") return s;
            const textNode = without[textIdx] as MasterTextNode;

            const before: MasterTextNode = {
              type: "text",
              id: crypto.randomUUID(),
              content: textNode.content.slice(0, target.charOffset),
            };
            const after: MasterTextNode = {
              type: "text",
              id: crypto.randomUUID(),
              content: textNode.content.slice(target.charOffset),
            };
            without.splice(textIdx, 1, before, sourceNode, after);
          }

          return {
            undoStack: [...s.undoStack, s.masterNodes].slice(-20),
            masterNodes: normalizeNodes(without),
          };
        }),

      updateTextNode: (nodeId, content) =>
        set((s) => ({
          masterNodes: s.masterNodes.map((n) =>
            n.id === nodeId && n.type === "text" ? { ...n, content } : n
          ),
        })),

      updatePromptNodeContent: (nodeId, content) =>
        set((s) => ({
          masterNodes: s.masterNodes.map((n) =>
            n.id === nodeId && n.type === "prompt" ? { ...n, content } : n
          ),
        })),

      toggleNodeExpanded: (nodeId) =>
        set((s) => ({
          masterNodes: s.masterNodes.map((n) =>
            n.id === nodeId && n.type === "prompt"
              ? { ...n, expanded: !n.expanded }
              : n
          ),
        })),

      removeNode: (nodeId) =>
        set((s) => ({
          undoStack: [...s.undoStack, s.masterNodes].slice(-20),
          masterNodes: normalizeNodes(
            s.masterNodes.filter((n) => n.id !== nodeId)
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
          const hasContent = s.masterNodes.some(
            (n) =>
              n.type === "prompt" ||
              (n.type === "text" && n.content.length > 0)
          );
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
    }),
    {
      name: "prompt-vault-storage",
      version: 3,
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
                    : "all",
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
          const converted: MasterNode[] = oldBlocks.map((b) => ({
            type: "prompt" as const,
            id: b.id,
            promptId: b.promptId,
            header: b.title,
            content: b.content,
            expanded: false,
          }));
          state = {
            ...state,
            masterNodes: normalizeNodes(converted),
          };
        }

        return state;
      },
      partialize: (state) => ({
        folders: state.folders,
        prompts: state.prompts,
        masterNodes: state.masterNodes,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
