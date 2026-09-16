import { useRef, useState } from "react";
import { useAppStore } from "../../store/promptStore";

export function EditModal() {
  const { editingPromptId, prompts, updatePrompt, setEditingPromptId } =
    useAppStore();

  const prompt = editingPromptId
    ? prompts.find((p) => p.id === editingPromptId)
    : null;

  const [title, setTitle] = useState(prompt?.title ?? "");
  const [content, setContent] = useState(prompt?.content ?? "");
  const mouseDownInsideRef = useRef(false);

  const handleSave = () => {
    if (prompt) {
      updatePrompt(prompt.id, title.trim() || "Untitled", content);
    }
  };

  const handleClose = () => {
    setEditingPromptId(null);
  };

  if (!prompt) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={() => { mouseDownInsideRef.current = false; }}
      onClick={() => { if (!mouseDownInsideRef.current) handleClose(); }}
    >
      <div
        className="bg-surface-container rounded-xl p-6 w-[36rem] max-h-[85%] border border-outline-variant/20 shadow-2xl flex flex-col"
        onMouseDown={(e) => { e.stopPropagation(); mouseDownInsideRef.current = true; }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4">
          Edit Prompt
        </h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-surface-container-highest text-on-surface text-sm px-3 py-2 rounded mb-3 border-none outline-none focus:ring-1 focus:ring-outline"
          placeholder="Prompt title..."
          autoFocus
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={16}
          className="w-full flex-1 min-h-0 bg-surface-container-highest text-on-surface text-sm px-3 py-2 rounded border-none outline-none focus:ring-1 focus:ring-outline resize-none"
          placeholder="Prompt content..."
        />

        <div className="flex justify-end gap-2 mt-4 shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary-fixed-dim transition-all active:scale-[0.98]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
