import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAppStore } from "../../store/promptStore";
import type { EditorTextNode } from "../../store/promptStore";
import { Icon } from "./Icon";

const PROMPT_DND_TYPE = "application/prompt-json";

function hasPromptDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(PROMPT_DND_TYPE);
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

function TextNodeView({ node, solo }: { node: EditorTextNode; solo?: boolean }) {
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
      className={`w-full outline-none text-xs font-sans font-semibold text-on-surface/85 leading-relaxed resize-none bg-transparent block overflow-hidden transition-colors duration-150 ${
        solo && !node.content ? "min-h-[4rem]" : ""
      }`}
    />
  );
}

type DropCaret = { containerX: number; containerY: number } | null;

export function EditorBox({ width }: { width: number }) {
  const editorNodes = useAppStore((s) => s.editorNodes);
  const undoStack = useAppStore((s) => s.undoStack);
  const undoEditor = useAppStore((s) => s.undoEditor);
  const clearEditor = useAppStore((s) => s.clearEditor);
  const insertContentAtOffset = useAppStore((s) => s.insertContentAtOffset);
  const touchPrompt = useAppStore((s) => s.touchPrompt);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dropCaret, setDropCaret] = useState<DropCaret>(null);

  const hasContent = editorNodes.some((n) => n.content.length > 0);
  const isEmpty = editorNodes.every((n) => !n.content);

  const handleCopy = async () => {
    const text = editorNodes[0]?.content ?? "";
    await navigator.clipboard.writeText(text);
  };

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.closest("button")) return;
    const textarea = containerRef.current?.querySelector(
      "textarea[data-node-type='text']"
    ) as HTMLTextAreaElement | null;
    textarea?.focus();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!hasPromptDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setDropCaret({
      containerX: e.clientX - rect.left,
      containerY: e.clientY - rect.top,
    });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const container = containerRef.current;
    if (container && !container.contains(e.relatedTarget as Node)) {
      setDropCaret(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropCaret(null);
      const raw = e.dataTransfer.getData(PROMPT_DND_TYPE);
      if (!raw) return;

      const data = JSON.parse(raw) as { id: string; content: string };
      const textarea = containerRef.current?.querySelector(
        "textarea[data-node-type='text']"
      ) as HTMLTextAreaElement | null;
      const charOffset = textarea
        ? getCharOffsetAtPoint(textarea, e.clientX, e.clientY)
        : (editorNodes[0]?.content.length ?? 0);

      insertContentAtOffset(charOffset, data.content);
      touchPrompt(data.id);
    },
    [editorNodes, insertContentAtOffset, touchPrompt]
  );

  return (
    <aside className="border-l border-outline-variant/10 bg-surface-container-low flex flex-col shrink-0" style={{ width }}>
      <div className="flex items-center gap-2 border-b border-outline-variant/10 px-3 py-2">
        <h2 className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Editor
        </h2>
        <div
          className="flex shrink-0 items-center gap-1"
          role="toolbar"
          aria-label="Editor actions"
        >
          <button
            type="button"
            onClick={undoEditor}
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
            onClick={clearEditor}
            disabled={!hasContent}
            className="rounded border border-outline-variant/20 p-1 text-on-surface-variant transition-colors duration-200 ease-in-out hover:border-outline-variant/30 hover:text-error disabled:opacity-30"
            title="Clear"
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
          {editorNodes.map((node) => (
            <TextNodeView key={node.id} node={node} solo={true} />
          ))}

          {dropCaret && (
            <div
              className="absolute pointer-events-none w-0.5 bg-primary rounded-full"
              style={{
                left: dropCaret.containerX,
                top: dropCaret.containerY - 9,
                height: "1.25em",
              }}
            />
          )}

          {isEmpty && !dropCaret && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs font-sans font-semibold text-on-surface/85 leading-normal italic">
                Type and drag prompts here...
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
