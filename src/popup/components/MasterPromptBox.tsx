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
  const {
    masterBlocks,
    undoStack,
    reorderMasterBlocks,
    undoMaster,
    clearMaster,
  } = useAppStore();

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
      <div className="flex items-center gap-2 border-b border-outline-variant/10 px-3 py-2">
        <h2 className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Master Prompt
        </h2>
        <div
          className="flex shrink-0 items-center gap-1"
          role="toolbar"
          aria-label="Master prompt actions"
        >
          <button
            type="button"
            onClick={undoMaster}
            disabled={undoStack.length === 0}
            className="rounded border border-outline-variant/20 p-1 text-on-surface-variant transition-colors duration-200 ease-in-out hover:border-outline-variant/30 hover:text-on-surface disabled:opacity-30"
            title="Undo"
          >
            <Icon name="undo" className="text-[16px]" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={masterBlocks.length === 0}
            className="rounded border border-outline-variant/20 p-1 text-on-surface-variant transition-colors duration-200 ease-in-out hover:border-outline-variant/30 hover:text-on-surface disabled:opacity-30"
            title="Copy to Clipboard"
          >
            <Icon name="content_copy" className="text-[16px]" />
          </button>
          <button
            type="button"
            onClick={clearMaster}
            disabled={masterBlocks.length === 0}
            className="rounded border border-outline-variant/20 p-1 text-on-surface-variant transition-colors duration-200 ease-in-out hover:border-outline-variant/30 hover:text-error disabled:opacity-30"
            title="Clear prompt"
          >
            <Icon name="delete" className="text-[16px]" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-inner">
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
            <p className="text-xs font-mono text-on-surface/50 leading-normal italic text-center py-6">
              Click a prompt to add it here...
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
