import { useState, useRef, useEffect, createContext, useContext } from "react";
import { useAppStore } from "../../store/promptStore";
import type { Folder } from "../../store/promptStore";
import { Icon } from "./Icon";
import { DeleteFolderModal } from "./DeleteFolderModal";

// Hovering within this many pixels of a root row's top or bottom edge targets
// the gap between rows ("move to root here") instead of the row itself.
const EDGE_BAND_PX = 6;

// Where a drop would land at the root: `index` is a slot in the root folder
// list; `area` marks the empty space below the tree (append to the end).
type RootDrop = { index: number; area: boolean } | null;

const RootDropContext = createContext<{
  rootDrop: RootDrop;
  setRootDrop: (d: RootDrop) => void;
}>({ rootDrop: null, setRootDrop: () => {} });

function InsertionLine({ edge }: { edge: "top" | "bottom" }) {
  return (
    <div
      className={`absolute left-0 right-0 h-0.5 bg-primary rounded-full pointer-events-none z-10 ${
        edge === "top" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2"
      }`}
    />
  );
}

function FolderItem({
  folder,
  depth,
  rootIndex,
}: {
  folder: Folder;
  depth: number;
  rootIndex?: number;
}) {
  const {
    folders,
    tabs,
    activeTabId,
    renamingFolderId,
    selectView,
    renameFolder,
    setRenamingFolderId,
    moveFolder,
  } = useAppStore();
  const { setRootDrop } = useContext(RootDropContext);

  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isActive = activeTab?.viewId === folder.id;
  const isRenaming = renamingFolderId === folder.id;
  const children = folders.filter((f) => f.parentId === folder.id);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("folder-id", folder.id);
    e.dataTransfer.effectAllowed = "move";
  };

  // Only root rows expose gap zones; inside a subtree the whole row nests.
  const rootSlotFor = (e: React.DragEvent): number | null => {
    if (rootIndex === undefined) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientY - rect.top < EDGE_BAND_PX) return rootIndex;
    if (rect.bottom - e.clientY < EDGE_BAND_PX) return rootIndex + 1;
    return null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("folder-id")) return;
    e.preventDefault();
    e.stopPropagation();
    const slot = rootSlotFor(e);
    setIsDragOver(slot === null);
    setRootDrop(slot === null ? null : { index: slot, area: false });
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setRootDrop(null);
    const draggedId = e.dataTransfer.getData("folder-id");
    if (!draggedId) return;
    const slot = rootSlotFor(e);
    if (slot !== null) {
      moveFolder(draggedId, null, slot);
    } else if (draggedId !== folder.id) {
      moveFolder(draggedId, folder.id);
    }
  };

  return (
    <div>
      <div
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isRenaming) {
            selectView(folder.id);
            if (children.length > 0) setIsExpanded((v) => !v);
          }
        }}
        className={`group flex items-center gap-3 py-2 cursor-pointer rounded-md transition-colors duration-200 active:scale-[0.98] ${
          isActive
            ? "bg-surface-container-high text-on-surface"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
        } ${isDragOver ? "ring-1 ring-primary/50 bg-surface-container-high" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 12}px`, paddingRight: "12px" }}
      >
        <Icon
          name={
            children.length > 0
              ? isExpanded
                ? "folder_open"
                : "folder"
              : "folder"
          }
          className="text-[20px]"
        />
        {isRenaming ? (
          <input
            ref={inputRef}
            defaultValue={folder.name}
            className="flex-1 bg-surface-container-highest text-on-surface text-sm px-1 py-0 rounded border-none outline-none focus:ring-1 focus:ring-outline min-w-0"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                renameFolder(
                  folder.id,
                  e.currentTarget.value.trim() || folder.name
                );
              } else if (e.key === "Escape") {
                setRenamingFolderId(null);
              }
            }}
            onBlur={(e) =>
              renameFolder(
                folder.id,
                e.currentTarget.value.trim() || folder.name
              )
            }
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm whitespace-nowrap group-hover:overflow-hidden group-hover:text-ellipsis">{folder.name}</span>
        )}
        {!isRenaming && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-0 overflow-hidden group-hover:w-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenamingFolderId(folder.id);
              }}
              className="p-0.5 text-on-surface-variant hover:text-on-surface transition-colors"
              title="Rename"
            >
              <Icon name="edit" className="text-[14px]" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingFolder(folder);
              }}
              className="p-0.5 text-on-surface-variant hover:text-error transition-colors"
              title="Delete"
            >
              <Icon name="delete" className="text-[14px]" />
            </button>
          </div>
        )}
      </div>
      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FolderItem key={child.id} folder={child} depth={depth + 1} />
          ))}
        </div>
      )}
      {deletingFolder && (
        <DeleteFolderModal
          folder={deletingFolder}
          onClose={() => setDeletingFolder(null)}
        />
      )}
    </div>
  );
}

export function FolderTree() {
  const { folders, moveFolder } = useAppStore();
  const [rootDrop, setRootDrop] = useState<RootDrop>(null);
  const rootFolders = folders.filter((f) => f.parentId === null);

  // Rows stop propagation of their own drag events, so these only fire over the
  // empty space below the tree and the thin margins between rows. Only the
  // former is the "append to root" area; in a margin the adjacent row's edge
  // band has already set the insertion line, so leave it alone.
  const isBelowLastRow = (e: React.DragEvent) => {
    const last = e.currentTarget.lastElementChild;
    return !last || e.clientY > last.getBoundingClientRect().bottom;
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("folder-id")) return;
    e.preventDefault();
    if (isBelowLastRow(e)) setRootDrop({ index: rootFolders.length, area: true });
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setRootDrop(null);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setRootDrop(null);
    const draggedId = e.dataTransfer.getData("folder-id");
    if (draggedId) {
      moveFolder(draggedId, null, rootDrop?.index ?? rootFolders.length);
    }
  };

  return (
    <RootDropContext.Provider value={{ rootDrop, setRootDrop }}>
      <div
        className={`space-y-0.5 min-h-16 rounded-md transition-colors ${
          rootDrop?.area ? "ring-1 ring-primary/50 bg-surface-container-high/40" : ""
        }`}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
        onDragEnd={() => setRootDrop(null)}
      >
        {rootFolders.map((folder, i) => (
          <div key={folder.id} className="relative">
            {!rootDrop?.area && rootDrop?.index === i && (
              <InsertionLine edge="top" />
            )}
            <FolderItem folder={folder} depth={0} rootIndex={i} />
            {!rootDrop?.area &&
              rootDrop?.index === rootFolders.length &&
              i === rootFolders.length - 1 && <InsertionLine edge="bottom" />}
          </div>
        ))}
      </div>
    </RootDropContext.Provider>
  );
}
