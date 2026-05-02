import { useEffect } from "react";
import { useAppStore } from "../../store/promptStore";
import type { Folder } from "../../store/promptStore";

interface DeleteFolderModalProps {
  folder: Folder;
  onClose: () => void;
}

export function DeleteFolderModal({ folder, onClose }: DeleteFolderModalProps) {
  const { deleteFolder } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleConfirm = () => {
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
        className="w-[380px] rounded-md p-6 flex flex-col gap-5"
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
            Are you sure you want to delete{" "}
            <span className="text-on-surface font-medium">"{folder.name}"</span>{" "}
            and all prompts inside it? This action cannot be undone.
          </p>
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
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
            style={{ background: "#ee7d77", color: "#1a0a09" }}
          >
            Delete folder
          </button>
        </div>
      </div>
    </div>
  );
}
