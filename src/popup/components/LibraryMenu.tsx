import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAppStore } from "../../store/promptStore";
import {
  assertFitsInStorage,
  downloadLibrary,
  parseLibrary,
} from "../../store/libraryTransfer";
import { Icon } from "./Icon";

const ITEM_CLASS =
  "flex items-center gap-3 w-full px-3 py-2 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-200";

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function LibraryMenu() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // composedPath() sees into the in-page panel's shadow root, where the
    // event target is retargeted to the host element.
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const handleExport = () => {
    const { folders, prompts } = useAppStore.getState();
    downloadLibrary({ folders, prompts });
    setStatus(
      `Exported ${plural(prompts.length, "prompt")}, ${plural(folders.length, "folder")}`
    );
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    e.target.value = "";
    if (!file) return;
    try {
      const data = parseLibrary(await file.text());
      await assertFitsInStorage(data);
      useAppStore.getState().importLibrary(data);
      setStatus(
        `Imported ${plural(data.prompts.length, "prompt")}, ${plural(data.folders.length, "folder")}`
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed.");
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => {
          setStatus(null);
          setOpen((v) => !v);
        }}
        title="Import or export prompts"
        className="flex items-center justify-center w-9 h-9 rounded-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
      >
        <Icon name="more_vert" className="text-[20px]" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFile}
        className="hidden"
      />
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 w-56 p-2 bg-surface-container-low text-sm tracking-tight border border-outline-variant/20 rounded-md shadow-2xl">
          <button type="button" onClick={handleExport} className={ITEM_CLASS}>
            <Icon name="download" className="text-[20px]" />
            <span>Export prompts</span>
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={ITEM_CLASS}
          >
            <Icon name="upload" className="text-[20px]" />
            <span>Import prompts</span>
          </button>
          {status && (
            <p
              role="status"
              className="px-3 pt-2 mt-1 border-t border-outline-variant/10 text-xs text-on-surface-variant"
            >
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
