import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAppStore } from "../../store/promptStore";
import type { MasterNode } from "../../store/promptStore";
import { Icon } from "./Icon";

const PROMPT_DND_TYPE = "application/prompt-json";
const REORDER_FLAG = "application/prompt-reorder";

const FRAGMENT_SPAN_CLASS =
  "rounded px-1 bg-primary/20 text-on-surface box-decoration-clone";
const HANDLE_CLASS =
  "material-symbols-outlined select-none align-middle mr-0.5 cursor-grab text-on-surface-variant";

function structureKey(nodes: MasterNode[]): string {
  return nodes.map((n) => `${n.type}:${n.id}`).join("|");
}

function makeHandle(): HTMLSpanElement {
  const handle = document.createElement("span");
  handle.className = HANDLE_CLASS;
  handle.style.fontSize = "13px";
  handle.contentEditable = "false";
  handle.draggable = true;
  handle.dataset.role = "handle";
  handle.textContent = "drag_indicator";
  return handle;
}

function buildEditorDom(editor: HTMLDivElement, nodes: MasterNode[]) {
  editor.innerHTML = "";
  for (const node of nodes) {
    const span = document.createElement("span");
    span.dataset.id = node.id;
    span.dataset.type = node.type;
    if (node.type === "text") {
      span.appendChild(document.createTextNode(node.content));
    } else {
      span.dataset.promptId = node.promptId;
      span.dataset.header = node.header;
      span.className = FRAGMENT_SPAN_CLASS;
      span.appendChild(makeHandle());
      span.appendChild(document.createTextNode(node.content));
    }
    editor.appendChild(span);
  }
}

function fragmentText(span: HTMLElement): string {
  let text = "";
  for (const c of Array.from(span.childNodes)) {
    if (c instanceof HTMLElement && c.dataset.role === "handle") continue;
    text += c.textContent || "";
  }
  return text;
}

function parseEditorDom(editor: HTMLDivElement): MasterNode[] {
  const result: MasterNode[] = [];
  const flushText = (text: string) => {
    if (!text) return;
    const last = result[result.length - 1];
    if (last?.type === "text") {
      last.content += text;
    } else {
      result.push({ type: "text", id: crypto.randomUUID(), content: text });
    }
  };

  for (const child of Array.from(editor.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      flushText(child.textContent || "");
    } else if (child instanceof HTMLElement) {
      const id = child.dataset.id;
      const type = child.dataset.type;
      if (id && type === "text") {
        result.push({ type: "text", id, content: child.textContent || "" });
      } else if (id && type === "prompt") {
        const text = fragmentText(child);
        if (!text) continue;
        result.push({
          type: "prompt",
          id,
          promptId: child.dataset.promptId || "",
          header: child.dataset.header || "",
          content: text,
        });
      } else {
        flushText(child.textContent || "");
      }
    }
  }

  return result;
}

function ensureHandles(editor: HTMLDivElement) {
  for (const child of Array.from(editor.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.dataset.type !== "prompt") continue;
    const first = child.firstChild;
    const hasHandle =
      first instanceof HTMLElement && first.dataset.role === "handle";
    if (!hasHandle) {
      child.insertBefore(makeHandle(), first);
    }
  }
}

interface DropTarget {
  spanId: string;
  offset: number;
  caret: { x: number; y: number; h: number };
}

function getCaretRange(clientX: number, clientY: number): Range | null {
  const docAny = document as unknown as {
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (typeof docAny.caretPositionFromPoint === "function") {
    const pos = docAny.caretPositionFromPoint(clientX, clientY);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  }
  if (typeof document.caretRangeFromPoint === "function") {
    return document.caretRangeFromPoint(clientX, clientY);
  }
  return null;
}

function computeDropTarget(
  editor: HTMLDivElement,
  container: HTMLDivElement,
  clientX: number,
  clientY: number,
  excludeSourceId?: string
): DropTarget | null {
  const range = getCaretRange(clientX, clientY);
  const containerRect = container.getBoundingClientRect();

  const fallbackToEnd = (): DropTarget | null => {
    const all = editor.querySelectorAll<HTMLElement>(
      '[data-id][data-type="text"]'
    );
    const span = all[all.length - 1];
    if (!span) return null;
    const rect = span.getBoundingClientRect();
    return {
      spanId: span.dataset.id!,
      offset: span.textContent?.length || 0,
      caret: {
        x: rect.right - containerRect.left + container.scrollLeft,
        y: rect.top - containerRect.top + container.scrollTop,
        h: rect.height || 16,
      },
    };
  };

  if (!range) return fallbackToEnd();

  let span: HTMLElement | null = null;
  let n: Node | null = range.startContainer;
  while (n) {
    if (n instanceof HTMLElement && n.dataset.id) {
      span = n;
      break;
    }
    n = n.parentNode;
  }
  if (!span || !editor.contains(span)) return fallbackToEnd();
  if (excludeSourceId && span.dataset.id === excludeSourceId) return null;

  let charOffset = 0;
  const startNode = range.startContainer;
  const startOffset = range.startOffset;

  if (startNode.nodeType === Node.TEXT_NODE && span.contains(startNode)) {
    let s: Node | null = span.firstChild;
    while (s && s !== startNode) {
      if (!(s instanceof HTMLElement && s.dataset.role === "handle")) {
        charOffset += s.textContent?.length || 0;
      }
      s = s.nextSibling;
    }
    charOffset += startOffset;
  } else if (startNode === span) {
    let s: Node | null = span.firstChild;
    let i = 0;
    while (s && i < startOffset) {
      if (!(s instanceof HTMLElement && s.dataset.role === "handle")) {
        charOffset += s.textContent?.length || 0;
      }
      s = s.nextSibling;
      i++;
    }
  }

  let rect: DOMRect = range.getBoundingClientRect();
  if (!rect.height) rect = span.getBoundingClientRect();

  return {
    spanId: span.dataset.id!,
    offset: charOffset,
    caret: {
      x: rect.left - containerRect.left + container.scrollLeft,
      y: rect.top - containerRect.top + container.scrollTop,
      h: rect.height || 16,
    },
  };
}

function makeDragPill(title: string): HTMLDivElement {
  const pill = document.createElement("div");
  pill.textContent = title || "Untitled";
  pill.className =
    "fixed left-0 px-2 py-1 rounded-full text-xs font-medium bg-primary text-on-primary pointer-events-none whitespace-nowrap";
  pill.style.top = "-1000px";
  document.body.appendChild(pill);
  return pill;
}

function moveCursorOutBackward(span: HTMLElement) {
  const prev = span.previousSibling;
  const sel = window.getSelection();
  if (!sel || !prev) return;
  const range = document.createRange();
  if (prev.nodeType === Node.TEXT_NODE) {
    range.setStart(prev, prev.textContent?.length || 0);
  } else if (prev instanceof HTMLElement) {
    const last = prev.lastChild;
    if (last?.nodeType === Node.TEXT_NODE) {
      range.setStart(last, last.textContent?.length || 0);
    } else {
      range.selectNodeContents(prev);
      range.collapse(false);
    }
  } else {
    return;
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function moveCursorIntoForward(span: HTMLElement) {
  const sel = window.getSelection();
  if (!sel) return;
  // First text node inside the fragment (after the handle)
  let firstText: Node | null = null;
  for (const c of Array.from(span.childNodes)) {
    if (c.nodeType === Node.TEXT_NODE) {
      firstText = c;
      break;
    }
  }
  const range = document.createRange();
  if (firstText) {
    range.setStart(firstText, 0);
  } else {
    range.selectNodeContents(span);
    range.collapse(false);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function MasterPromptBox({ width }: { width: number }) {
  const masterNodes = useAppStore((s) => s.masterNodes);
  const undoStack = useAppStore((s) => s.undoStack);
  const undoMaster = useAppStore((s) => s.undoMaster);
  const clearMaster = useAppStore((s) => s.clearMaster);
  const insertPromptInline = useAppStore((s) => s.insertPromptInline);
  const movePromptInline = useAppStore((s) => s.movePromptInline);
  const setMasterNodes = useAppStore((s) => s.setMasterNodes);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastStructureKeyRef = useRef("");
  const dragSourceIdRef = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const renderedNodes = useMemo<MasterNode[]>(
    () =>
      masterNodes.length === 0
        ? [{ type: "text", id: "__empty", content: "" }]
        : masterNodes,
    [masterNodes]
  );

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const newKey = structureKey(renderedNodes);
    if (newKey === lastStructureKeyRef.current) return;
    lastStructureKeyRef.current = newKey;
    buildEditorDom(editor, renderedNodes);
  }, [renderedNodes]);

  const hasContent = masterNodes.some(
    (n) => n.type === "prompt" || (n.type === "text" && n.content.length > 0)
  );
  const isEmpty = masterNodes.every(
    (n) => n.type === "text" && !n.content
  );

  const handleCopy = async () => {
    const text = masterNodes
      .map((n) => n.content)
      .filter(Boolean)
      .join("");
    await navigator.clipboard.writeText(text);
  };

  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    ensureHandles(editor);
    const parsed = parseEditorDom(editor);
    const parsedKey = structureKey(parsed);
    const domNodes: Array<{ type: string; id: string }> = [];
    for (const c of Array.from(editor.children)) {
      if (c instanceof HTMLElement && c.dataset.id && c.dataset.type) {
        domNodes.push({ type: c.dataset.type, id: c.dataset.id });
      }
    }
    const domKey = domNodes.map((n) => `${n.type}:${n.id}`).join("|");
    if (parsedKey === domKey) {
      lastStructureKeyRef.current = parsedKey;
    }
    setMasterNodes(parsed);
  }, [setMasterNodes]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.execCommand("insertText", false, "\n");
      return;
    }
    if (e.key === "Backspace") {
      const sel = window.getSelection();
      if (!sel?.rangeCount || !sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      let span: HTMLElement | null = null;
      let n: Node | null = range.startContainer;
      while (n) {
        if (n instanceof HTMLElement && n.dataset.type === "prompt") {
          span = n;
          break;
        }
        n = n.parentNode;
      }
      if (!span) return;
      const firstText = Array.from(span.childNodes).find(
        (c) => c.nodeType === Node.TEXT_NODE
      );
      const atStart =
        firstText &&
        range.startContainer === firstText &&
        range.startOffset === 0;
      if (atStart) {
        e.preventDefault();
        moveCursorOutBackward(span);
      }
      return;
    }
    if (e.key === "Delete") {
      const sel = window.getSelection();
      if (!sel?.rangeCount || !sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const startNode = range.startContainer;
      // If cursor is at end of a text span and the next sibling span is a prompt
      if (startNode.nodeType === Node.TEXT_NODE) {
        const text = startNode.textContent || "";
        if (range.startOffset === text.length) {
          const parent = startNode.parentElement;
          if (parent?.dataset.type === "text") {
            const next = parent.nextElementSibling as HTMLElement | null;
            if (next?.dataset.type === "prompt") {
              e.preventDefault();
              moveCursorIntoForward(next);
            }
          }
        }
      }
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (text) document.execCommand("insertText", false, text);
  }, []);

  const handleEditorDragStart = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const handle = target.closest?.('[data-role="handle"]') as
      | HTMLElement
      | null;
    if (!handle) {
      e.preventDefault();
      return;
    }
    const span = handle.closest('[data-type="prompt"]') as HTMLElement | null;
    if (!span) {
      e.preventDefault();
      return;
    }
    const id = span.dataset.id!;
    const promptId = span.dataset.promptId || "";
    const header = span.dataset.header || "";
    const content = fragmentText(span);

    e.dataTransfer.setData(
      PROMPT_DND_TYPE,
      JSON.stringify({
        id: promptId,
        title: header,
        content,
        sourceNodeId: id,
      })
    );
    e.dataTransfer.setData(REORDER_FLAG, id);
    e.dataTransfer.effectAllowed = "move";

    const pill = makeDragPill(header);
    e.dataTransfer.setDragImage(pill, 12, 12);
    requestAnimationFrame(() => pill.remove());

    dragSourceIdRef.current = id;
    span.style.opacity = "0.4";
  }, []);

  const handleEditorDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const span = target.closest?.('[data-type="prompt"]') as
      | HTMLElement
      | null;
    if (span) span.style.opacity = "";
    dragSourceIdRef.current = null;
    setDropTarget(null);
  }, []);

  const hasPromptDrag = (e: React.DragEvent) =>
    e.dataTransfer.types.includes(PROMPT_DND_TYPE);
  const isReorderDrag = (e: React.DragEvent) =>
    e.dataTransfer.types.includes(REORDER_FLAG);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!hasPromptDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = isReorderDrag(e) ? "move" : "copy";
    const editor = editorRef.current;
    const container = containerRef.current;
    if (!editor || !container) return;
    const target = computeDropTarget(
      editor,
      container,
      e.clientX,
      e.clientY,
      dragSourceIdRef.current || undefined
    );
    setDropTarget(target);
  }, []);

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
      const editor = editorRef.current;
      const container = containerRef.current;
      setDropTarget(null);
      if (!raw || !editor || !container) return;

      const data = JSON.parse(raw) as {
        id: string;
        title: string;
        content: string;
        sourceNodeId?: string;
      };

      const target = computeDropTarget(
        editor,
        container,
        e.clientX,
        e.clientY,
        data.sourceNodeId
      );
      if (!target) return;

      if (data.sourceNodeId) {
        movePromptInline(data.sourceNodeId, target.spanId, target.offset);
      } else {
        insertPromptInline(
          target.spanId,
          target.offset,
          data.id,
          data.title,
          data.content
        );
      }
    },
    [insertPromptInline, movePromptInline]
  );

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    const editor = editorRef.current;
    if (!editor || editor.contains(target)) return;
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);

  return (
    <aside className="border-l border-outline-variant/10 bg-surface-container-low flex flex-col shrink-0" style={{ width }}>
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
          onDragStart={handleEditorDragStart}
          onDragEnd={handleEditorDragEnd}
          className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-inner relative cursor-text"
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="outline-none text-xs font-mono text-on-surface leading-relaxed whitespace-pre-wrap break-words min-h-full"
          />
          {dropTarget && (
            <div
              className="absolute w-0.5 bg-primary pointer-events-none rounded-full"
              style={{
                left: dropTarget.caret.x,
                top: dropTarget.caret.y,
                height: dropTarget.caret.h,
              }}
            />
          )}
          {isEmpty && !dropTarget && (
            <div className="absolute inset-3 flex items-center justify-center pointer-events-none">
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
