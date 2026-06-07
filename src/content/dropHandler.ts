import type { PlatformAdapter } from "./platforms/types";
import { useAppStore } from "../store/promptStore";

// Matches the dataTransfer type set by PromptCard's drag start.
const PROMPT_DND_TYPE = "application/prompt-json";
const HIGHLIGHT_COLOR = "#c6c6c7";

function hasPromptDrag(e: DragEvent): boolean {
  return !!e.dataTransfer?.types.includes(PROMPT_DND_TYPE);
}

// Listens at the document level so it survives the platform re-rendering its
// input: the target element is resolved fresh from the adapter on every event,
// never cached.
export function setupDropTarget(adapter: PlatformAdapter): void {
  let highlighted: HTMLElement | null = null;
  let prevOutline = "";
  let prevOutlineOffset = "";

  const highlight = (el: HTMLElement) => {
    if (highlighted === el) return;
    clearHighlight();
    highlighted = el;
    prevOutline = el.style.outline;
    prevOutlineOffset = el.style.outlineOffset;
    el.style.outline = `2px solid ${HIGHLIGHT_COLOR}`;
    el.style.outlineOffset = "2px";
  };

  const clearHighlight = () => {
    if (!highlighted) return;
    highlighted.style.outline = prevOutline;
    highlighted.style.outlineOffset = prevOutlineOffset;
    highlighted = null;
  };

  const inputUnderEvent = (e: DragEvent): HTMLElement | null => {
    const input = adapter.getInputElement();
    const target = e.target as Node | null;
    return input && target && input.contains(target) ? input : null;
  };

  document.addEventListener(
    "dragover",
    (e) => {
      if (!hasPromptDrag(e)) return;
      const input = inputUnderEvent(e);
      if (!input) {
        clearHighlight();
        return;
      }
      // Allow the drop and show copy affordance.
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      highlight(input);
    },
    true
  );

  document.addEventListener(
    "dragleave",
    (e) => {
      if (!highlighted) return;
      const related = e.relatedTarget as Node | null;
      if (!related || !highlighted.contains(related)) clearHighlight();
    },
    true
  );

  document.addEventListener(
    "drop",
    (e) => {
      if (!hasPromptDrag(e)) return;
      const input = inputUnderEvent(e);
      clearHighlight();
      if (!input) return;
      e.preventDefault();

      const raw = e.dataTransfer?.getData(PROMPT_DND_TYPE);
      if (!raw) return;
      let data: { id: string; content: string };
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }

      adapter.insertText(input, data.content, { x: e.clientX, y: e.clientY });
      useAppStore.getState().touchPrompt(data.id);
    },
    true
  );

  document.addEventListener("dragend", clearHighlight, true);
}
