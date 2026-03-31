import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAppStore } from "../../store/promptStore";
import type {
  MasterTextNode,
  MasterPromptNode,
  MasterNode,
} from "../../store/promptStore";
import { Icon } from "./Icon";

const PROMPT_DND_TYPE = "application/prompt-json";
const REORDER_FLAG = "application/prompt-reorder";

function hasPromptDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(PROMPT_DND_TYPE);
}

function isReorderDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(REORDER_FLAG);
}

function getCharOffsetAtPoint(
  textarea: HTMLTextAreaElement,
  clientX: number,
  clientY: number
): number {
  const text = textarea.value;
  if (!text) return 0;

  const computed = getComputedStyle(textarea);
  const rect = textarea.getBoundingClientRect();

  const mirror = document.createElement("div");
  mirror.style.cssText = `
    position:fixed;
    left:${rect.left}px; top:${rect.top}px;
    width:${computed.width}; height:${rect.height}px;
    font:${computed.font};
    padding:${computed.padding};
    line-height:${computed.lineHeight};
    letter-spacing:${computed.letterSpacing};
    white-space:pre-wrap; word-break:break-word; overflow-wrap:break-word;
    box-sizing:${computed.boxSizing};
    overflow:hidden; z-index:999999;
  `;
  mirror.contentEditable = "true";
  mirror.textContent = text;
  document.body.appendChild(mirror);

  const range = document.caretRangeFromPoint(clientX, clientY);
  let offset = text.length;

  if (range && mirror.contains(range.startContainer)) {
    const pre = document.createRange();
    pre.selectNodeContents(mirror);
    pre.setEnd(range.startContainer, range.startOffset);
    offset = pre.toString().length;
  }

  document.body.removeChild(mirror);
  return Math.min(offset, text.length);
}

function DropLine() {
  return <div className="h-0.5 bg-primary rounded-full my-1" />;
}

function TextNodeView({
  node,
  highlighted,
  solo,
}: {
  node: MasterTextNode;
  highlighted?: boolean;
  solo?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateTextNode = useAppStore((s) => s.updateTextNode);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (!ta.value) {
      ta.style.height =
        document.activeElement === ta ? "1.5em" : solo ? "" : "4px";
      return;
    }
    ta.style.height = "0";
    ta.style.height = ta.scrollHeight + "px";
  }, [solo]);

  useLayoutEffect(autoResize, [node.content, autoResize]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateTextNode(node.id, e.target.value);
    },
    [node.id, updateTextNode]
  );

  return (
    <textarea
      ref={textareaRef}
      value={node.content}
      onChange={handleChange}
      onFocus={autoResize}
      onBlur={autoResize}
      data-node-id={node.id}
      data-node-type="text"
      rows={1}
      className={`w-full outline-none text-xs font-mono text-on-surface leading-relaxed resize-none bg-transparent block overflow-hidden transition-colors duration-150 ${
        solo && !node.content ? "min-h-[4rem]" : ""
      } ${highlighted ? "bg-primary/10 ring-1 ring-primary/30 rounded" : ""}`}
    />
  );
}

function PromptNodeView({ node }: { node: MasterPromptNode }) {
  const toggleNodeExpanded = useAppStore((s) => s.toggleNodeExpanded);
  const removeNode = useAppStore((s) => s.removeNode);
  const updatePromptNodeContent = useAppStore(
    (s) => s.updatePromptNodeContent
  );
  const blockRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0";
    ta.style.height = Math.max(ta.scrollHeight, 48) + "px";
  }, []);

  useLayoutEffect(() => {
    if (node.expanded) autoResize();
  }, [node.content, node.expanded, autoResize]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (blockRef.current) {
        const rect = blockRef.current.getBoundingClientRect();
        e.dataTransfer.setDragImage(
          blockRef.current,
          e.clientX - rect.left,
          e.clientY - rect.top
        );
      }
      e.dataTransfer.setData(
        PROMPT_DND_TYPE,
        JSON.stringify({
          id: node.promptId,
          title: node.header,
          content: node.content,
          sourceNodeId: node.id,
          expanded: node.expanded,
        })
      );
      e.dataTransfer.setData(REORDER_FLAG, node.id);
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
    },
    [node]
  );

  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  return (
    <div
      ref={blockRef}
      className={`bg-surface-variant/50 rounded-lg border-l-2 border-primary-dim my-1 transition-opacity duration-150 ${
        isDragging ? "opacity-40" : ""
      }`}
      data-node-id={node.id}
      data-node-type="prompt"
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className="cursor-grab active:cursor-grabbing text-on-surface-variant shrink-0"
          title="Drag to reorder"
        >
          <Icon name="drag_indicator" className="text-[14px]" />
        </div>
        <span className="text-xs font-semibold text-on-surface truncate flex-1">
          {node.header}
        </span>
        <button
          type="button"
          onClick={() => toggleNodeExpanded(node.id)}
          className="p-0.5 text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          title={node.expanded ? "Collapse" : "Expand"}
        >
          <Icon
            name={node.expanded ? "expand_less" : "expand_more"}
            className="text-[14px]"
          />
        </button>
        <button
          type="button"
          onClick={() => removeNode(node.id)}
          className="p-0.5 text-on-surface-variant hover:text-error transition-colors shrink-0"
          title="Remove"
        >
          <Icon name="close" className="text-[14px]" />
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          node.expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-2.5 pb-2">
            <textarea
              ref={textareaRef}
              value={node.content}
              onChange={(e) =>
                updatePromptNodeContent(node.id, e.target.value)
              }
              className="w-full text-xs font-mono text-on-surface/80 bg-surface-container-lowest rounded px-2 py-1.5 leading-relaxed resize-none outline-none border-none focus:ring-1 focus:ring-outline/50"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type DropTarget =
  | { type: "gap"; index: number }
  | { type: "text-split"; textNodeId: string }
  | null;

export function MasterPromptBox() {
  const masterNodes = useAppStore((s) => s.masterNodes);
  const undoStack = useAppStore((s) => s.undoStack);
  const undoMaster = useAppStore((s) => s.undoMaster);
  const clearMaster = useAppStore((s) => s.clearMaster);
  const insertPromptNode = useAppStore((s) => s.insertPromptNode);
  const splitTextAndInsertPrompt = useAppStore(
    (s) => s.splitTextAndInsertPrompt
  );
  const movePromptNode = useAppStore((s) => s.movePromptNode);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);

  const hasContent = masterNodes.some(
    (n) =>
      n.type === "prompt" || (n.type === "text" && n.content.length > 0)
  );

  const isEmpty = masterNodes.every(
    (n) => n.type === "text" && !n.content
  );

  const isSolo = masterNodes.length === 1;

  const handleCopy = async () => {
    const text = masterNodes
      .map((n) => n.content)
      .filter(Boolean)
      .join("\n\n");
    await navigator.clipboard.writeText(text);
  };

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.closest("button")) return;

      const textareas = containerRef.current?.querySelectorAll(
        "textarea[data-node-type='text']"
      );
      if (!textareas?.length) return;

      let closest: HTMLTextAreaElement | null = null;
      let minDist = Infinity;

      for (const ta of textareas) {
        const rect = ta.getBoundingClientRect();
        const dist = Math.abs(
          e.clientY - (rect.top + rect.height / 2)
        );
        if (dist < minDist) {
          minDist = dist;
          closest = ta as HTMLTextAreaElement;
        }
      }

      closest?.focus();
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!hasPromptDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = isReorderDrag(e) ? "move" : "copy";

      if (masterNodes.length === 0) {
        setDropTarget({ type: "gap", index: 0 });
        return;
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const textEl = el?.closest("[data-node-type='text']");
      if (textEl) {
        const nodeId = textEl.getAttribute("data-node-id");
        const node = masterNodes.find((n) => n.id === nodeId);
        if (node?.type === "text" && node.content.length > 0) {
          setDropTarget({ type: "text-split", textNodeId: nodeId! });
          return;
        }
      }

      const container = containerRef.current;
      if (!container) return;
      const nodeEls = container.querySelectorAll("[data-node-index]");
      const y = e.clientY;
      let insertIndex = masterNodes.length;

      for (let i = 0; i < nodeEls.length; i++) {
        const rect = nodeEls[i].getBoundingClientRect();
        if (y < rect.top + rect.height / 2) {
          insertIndex = parseInt(
            nodeEls[i].getAttribute("data-node-index")!
          );
          break;
        }
      }

      setDropTarget({ type: "gap", index: insertIndex });
    },
    [masterNodes]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const container = containerRef.current;
    if (container && !container.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(PROMPT_DND_TYPE);
      const currentTarget = dropTarget;
      setDropTarget(null);
      if (!raw) return;

      const data = JSON.parse(raw) as {
        id: string;
        title: string;
        content: string;
        sourceNodeId?: string;
        expanded?: boolean;
      };

      type ResolvedTarget =
        | { type: "gap"; index: number }
        | { type: "text-split"; textNodeId: string; charOffset: number };

      let resolved: ResolvedTarget;

      if (currentTarget?.type === "text-split") {
        const textarea = containerRef.current?.querySelector(
          `textarea[data-node-id="${currentTarget.textNodeId}"]`
        ) as HTMLTextAreaElement | null;

        resolved = {
          type: "text-split",
          textNodeId: currentTarget.textNodeId,
          charOffset: textarea
            ? getCharOffsetAtPoint(textarea, e.clientX, e.clientY)
            : 0,
        };
      } else {
        resolved = {
          type: "gap",
          index: currentTarget?.index ?? masterNodes.length,
        };
      }

      if (data.sourceNodeId) {
        movePromptNode(data.sourceNodeId, resolved);
      } else if (resolved.type === "text-split") {
        splitTextAndInsertPrompt(
          resolved.textNodeId,
          resolved.charOffset,
          data.id,
          data.title,
          data.content
        );
      } else {
        insertPromptNode(
          resolved.index,
          data.id,
          data.title,
          data.content
        );
      }
    },
    [
      dropTarget,
      masterNodes.length,
      insertPromptNode,
      splitTextAndInsertPrompt,
      movePromptNode,
    ]
  );

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
            disabled={!hasContent}
            className="rounded border border-outline-variant/20 p-1 text-on-surface-variant transition-colors duration-200 ease-in-out hover:border-outline-variant/30 hover:text-on-surface disabled:opacity-30"
            title="Copy to Clipboard"
          >
            <Icon name="content_copy" className="text-[16px]" />
          </button>
          <button
            type="button"
            onClick={clearMaster}
            disabled={!hasContent}
            className="rounded border border-outline-variant/20 p-1 text-on-surface-variant transition-colors duration-200 ease-in-out hover:border-outline-variant/30 hover:text-error disabled:opacity-30"
            title="Clear prompt"
          >
            <Icon name="delete" className="text-[16px]" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`min-h-0 flex-1 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-inner relative ${
            isEmpty ? "cursor-text" : ""
          }`}
        >
          {masterNodes.map((node: MasterNode, index: number) => (
            <Fragment key={node.id}>
              {dropTarget?.type === "gap" &&
                dropTarget.index === index && <DropLine />}
              <div data-node-index={index}>
                {node.type === "text" ? (
                  <TextNodeView
                    node={node}
                    solo={isSolo}
                    highlighted={
                      dropTarget?.type === "text-split" &&
                      dropTarget.textNodeId === node.id
                    }
                  />
                ) : (
                  <PromptNodeView node={node} />
                )}
              </div>
            </Fragment>
          ))}

          {dropTarget?.type === "gap" &&
            dropTarget.index === masterNodes.length && <DropLine />}

          {isEmpty && !dropTarget && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs font-mono text-on-surface/50 leading-normal italic">
                Type and drag prompts here...
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
