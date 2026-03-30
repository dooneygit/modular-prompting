import { useAppStore } from "../../store/promptStore";
import type { Prompt } from "../../store/promptStore";
import { Icon } from "./Icon";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const {
    appendToMaster,
    setEditingPromptId,
    deletePrompt,
    togglePromptFavorite,
  } = useAppStore();

  const favorited = prompt.favorited;

  return (
    <div
      onClick={() => appendToMaster(prompt)}
      className="p-3 bg-surface-container rounded-lg border border-transparent hover:border-outline-variant/30 hover:bg-surface-container-high transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-on-surface truncate min-w-0 flex-1">
          {prompt.title}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            aria-pressed={favorited}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
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
            onClick={(e) => {
              e.stopPropagation();
              setEditingPromptId(prompt.id);
            }}
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
          >
            <Icon name="edit" className="text-[16px]" />
          </button>
          <button
            type="button"
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
      <p className="text-xs text-on-surface-variant line-clamp-1 leading-relaxed">
        {prompt.content}
      </p>
    </div>
  );
}
