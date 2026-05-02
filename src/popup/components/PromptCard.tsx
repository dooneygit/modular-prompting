import { useState } from "react";
import { useAppStore } from "../../store/promptStore";
import type { Prompt } from "../../store/promptStore";
import { Icon } from "./Icon";

const PROMPT_DND_TYPE = "application/prompt-json";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const { setEditingPromptId, deletePrompt, togglePromptFavorite } =
    useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const favorited = prompt.favorited;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      PROMPT_DND_TYPE,
      JSON.stringify({
        id: prompt.id,
        title: prompt.title,
        content: prompt.content,
      })
    );
    e.dataTransfer.effectAllowed = "copy";

    const pill = document.createElement("div");
    pill.textContent = prompt.title || "Untitled";
    pill.className =
      "fixed left-0 px-2 py-1 rounded-full text-xs font-medium bg-primary text-on-primary pointer-events-none whitespace-nowrap";
    pill.style.top = "-1000px";
    document.body.appendChild(pill);
    e.dataTransfer.setDragImage(pill, 12, 12);
    requestAnimationFrame(() => pill.remove());

    setIsDragging(true);
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = prompt.content.trim() ? prompt.content : prompt.title;
    await navigator.clipboard.writeText(text);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`p-3 bg-surface-container rounded-lg border border-transparent hover:border-outline-variant/30 hover:bg-surface-container-high transition-all group cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => setEditingPromptId(prompt.id)}
          className="flex-1 min-w-0 text-left rounded-md p-0 bg-transparent border-none cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-outline focus-visible:outline-offset-2"
          aria-label={`Edit prompt: ${prompt.title}`}
        >
          <h3 className="text-sm font-semibold text-on-surface truncate mb-2">
            {prompt.title}
          </h3>
          <p className="text-xs text-on-surface-variant line-clamp-1 leading-relaxed">
            {prompt.content}
          </p>
        </button>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-start">
          <button
            type="button"
            aria-pressed={favorited}
            aria-label={
              favorited ? "Remove from favorites" : "Add to favorites"
            }
            onClick={(e) => {
              e.stopPropagation();
              togglePromptFavorite(prompt.id);
            }}
            className={
              favorited
                ? "p-1 text-primary hover:text-primary-fixed-dim transition-colors"
                : "p-1 text-on-surface-variant hover:text-primary transition-colors"
            }
          >
            <Icon name="star" filled={favorited} className="text-[16px]" />
          </button>
          <button
            type="button"
            aria-label="Copy prompt to clipboard"
            onClick={handleCopy}
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
          >
            <Icon name="content_copy" className="text-[16px]" />
          </button>
          <button
            type="button"
            aria-label="Delete prompt"
            onClick={(e) => {
              e.stopPropagation();
              deletePrompt(prompt.id);
            }}
            className="p-1 text-on-surface-variant hover:text-error transition-colors"
          >
            <Icon name="delete" className="text-[16px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
