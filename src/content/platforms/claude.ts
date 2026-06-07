import type { PlatformAdapter } from "./types";

// Claude.ai's message box is a ProseMirror contenteditable div backed by React,
// so `.value` assignment is meaningless and raw DOM mutation won't reach React's
// state. We insert via execCommand("insertText"), which emits the beforeinput/
// input events ProseMirror and React listen for.
export const claudeAdapter: PlatformAdapter = {
  id: "claude",

  matches: (url) => {
    try {
      return new URL(url).hostname === "claude.ai";
    } catch {
      return false;
    }
  },

  getInputElement: () =>
    document.querySelector<HTMLElement>(
      'div.ProseMirror[contenteditable="true"]'
    ) ?? document.querySelector<HTMLElement>('[contenteditable="true"]'),

  insertText: (input, text, point) => {
    input.focus();

    if (point) {
      const range = document.caretRangeFromPoint(point.x, point.y);
      if (range && input.contains(range.startContainer)) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }

    const inserted = document.execCommand("insertText", false, text);
    if (!inserted) {
      input.dispatchEvent(
        new InputEvent("beforeinput", {
          inputType: "insertText",
          data: text,
          bubbles: true,
          cancelable: true,
        })
      );
    }
  },
};
