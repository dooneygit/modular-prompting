import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "../../store/promptStore";
import type { MasterBlock } from "../../store/promptStore";
import { Icon } from "./Icon";

export function SortableBlock({ block }: { block: MasterBlock }) {
  const { removeFromMaster, setEditingBlockId } = useAppStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 bg-surface-variant/50 rounded-lg border-l-2 border-primary-dim group"
    >
      <div className="flex items-start">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mr-2 text-on-surface-variant shrink-0 mt-0.5"
        >
          <Icon name="drag_indicator" className="text-[16px]" />
        </div>
        <p className="text-xs font-mono text-on-surface leading-normal flex-1 break-words">
          {block.content || block.title}
        </p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
          <button
            onClick={() => setEditingBlockId(block.id)}
            className="p-0.5 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Icon name="edit" className="text-[14px]" />
          </button>
          <button
            onClick={() => removeFromMaster(block.id)}
            className="p-0.5 text-on-surface-variant hover:text-error transition-colors"
          >
            <Icon name="delete" className="text-[14px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
