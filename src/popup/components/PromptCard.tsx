import { useAppStore } from "../../store/promptStore";
import type { Prompt } from "../../store/promptStore";
import { Icon } from "./Icon";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const { appendToMaster, setEditingPromptId, deletePrompt } = useAppStore();

  return (
    <div
      onClick={() => appendToMaster(prompt)}
      className="p-3 bg-surface-container rounded-lg border border-transparent hover:border-outline-variant/30 hover:bg-surface-container-high transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-on-surface truncate pr-2">
          {prompt.title}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingPromptId(prompt.id);
            }}
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
          >
            <Icon name="edit" className="text-[16px]" />
          </button>
          <button
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
