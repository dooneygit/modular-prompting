import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAppStore } from "../../store/promptStore";
import { SortableBlock } from "./SortableBlock";
import { Icon } from "./Icon";

export function MasterPromptBox() {
  const { masterBlocks, undoStack, reorderMasterBlocks, undoMaster } =
    useAppStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderMasterBlocks(active.id as string, over.id as string);
    }
  };

  const handleCopy = async () => {
    const text = masterBlocks.map((b) => b.content).join("\n\n");
    await navigator.clipboard.writeText(text);
  };

  return (
    <aside className="w-72 border-l border-outline-variant/10 bg-surface-container-low flex flex-col shrink-0">
      <div className="p-4 border-b border-outline-variant/10">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          Active Prompt Builder
        </h2>
      </div>

      <div className="flex-1 p-4 relative flex flex-col min-h-0">
        <div className="flex-1 bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-inner relative group/box overflow-y-auto">
          {/* Corner Actions */}
          <div className="absolute top-2 right-2 flex gap-1 bg-surface-container-highest/80 backdrop-blur-md p-1 rounded-lg opacity-0 group-hover/box:opacity-100 transition-all z-10">
            <button
              onClick={undoMaster}
              disabled={undoStack.length === 0}
              className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
              title="Undo"
            >
              <Icon name="undo" className="text-[18px]" />
            </button>
            <button
              onClick={handleCopy}
              disabled={masterBlocks.length === 0}
              className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
              title="Copy to Clipboard"
            >
              <Icon name="content_copy" className="text-[18px]" />
            </button>
          </div>

          {/* Sortable Blocks */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={masterBlocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {masterBlocks.map((block) => (
                  <SortableBlock key={block.id} block={block} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {masterBlocks.length === 0 && (
            <p className="text-xs font-mono text-on-surface/50 leading-normal italic text-center py-8">
              Click a prompt to add it here...
            </p>
          )}
        </div>

        <div className="mt-4 space-y-3 shrink-0">
          <button
            onClick={handleCopy}
            disabled={masterBlocks.length === 0}
            className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-fixed-dim transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Icon name="send" className="text-[18px]" />
            Copy Full Context
          </button>
          <p className="text-[10px] text-center text-on-surface-variant/70 italic px-4">
            Combined prompts are ready to be pasted directly into your LLM of
            choice.
          </p>
        </div>
      </div>
    </aside>
  );
}
