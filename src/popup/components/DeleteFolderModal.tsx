import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../../store/promptStore";
import type { Folder } from "../../store/promptStore";

interface DeleteFolderModalProps {
  folder: Folder;
  onClose: () => void;
}

export function DeleteFolderModal({ folder, onClose }: DeleteFolderModalProps) {
  const { deleteFolder } = useAppStore();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfirmed = inputValue === folder.name;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleConfirm = () => {
    if (!isConfirmed) return;
    deleteFolder(folder.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-[420px] rounded-md p-6 flex flex-col gap-5"
        style={{
          background: "rgba(37, 38, 38, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(72, 72, 72, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-on-surface font-semibold" style={{ fontSize: "1.375rem", letterSpacing: "-0.01em" }}>
            Delete folder
          </span>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            This will permanently delete{" "}
            <span className="text-on-surface font-medium">"{folder.name}"</span>{" "}
            and all prompts inside it. This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-on-surface-variant text-xs uppercase tracking-wider">
            Type <span className="text-on-surface font-medium normal-case">{folder.name}</span> to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
            placeholder={folder.name}
            className="w-full text-sm text-on-surface placeholder-on-surface-variant/40 rounded-sm px-3 py-2 outline-none transition-all duration-200"
            style={{
              background: "#000000",
              border: "1px solid transparent",
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = "#2c2c2c";
              e.currentTarget.style.border = "1px solid #767575";
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = "#000000";
              e.currentTarget.style.border = "1px solid transparent";
            }}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-sm text-primary transition-colors duration-200"
            style={{ border: "1px solid rgba(72, 72, 72, 0.2)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(72,72,72,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
            style={{
              background: isConfirmed ? "#ee7d77" : "rgba(238,125,119,0.2)",
              color: isConfirmed ? "#1a0a09" : "rgba(238,125,119,0.4)",
              cursor: isConfirmed ? "pointer" : "not-allowed",
            }}
          >
            Delete folder
          </button>
        </div>
      </div>
    </div>
  );
}
