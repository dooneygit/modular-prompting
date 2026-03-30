import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../store/promptStore";
import type { Folder } from "../../store/promptStore";
import { Icon } from "./Icon";

function FolderItem({ folder, depth }: { folder: Folder; depth: number }) {
  const {
    folders,
    activeView,
    renamingFolderId,
    selectView,
    renameFolder,
    deleteFolder,
    setRenamingFolderId,
    moveFolder,
  } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = activeView === folder.id;
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData("folder-id");
    if (draggedId && draggedId !== folder.id) {
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
          <span className="flex-1 truncate text-sm">{folder.name}</span>
        )}
        {!isRenaming && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                deleteFolder(folder.id);
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
    </div>
  );
}

export function FolderTree() {
  const { folders, moveFolder } = useAppStore();
  const rootFolders = folders.filter((f) => f.parentId === null);

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("folder-id");
    if (draggedId) {
      moveFolder(draggedId, null);
    }
  };

  return (
    <div
      className="space-y-0.5"
      onDragOver={handleRootDragOver}
      onDrop={handleRootDrop}
    >
      {rootFolders.map((folder) => (
        <FolderItem key={folder.id} folder={folder} depth={0} />
      ))}
    </div>
  );
}
