import type { PlatformAdapter } from "./types";

// ChatGPT's composer (div#prompt-textarea) is a ProseMirror contenteditable,
// same as Claude's message box — so insertion uses the identical execCommand
// path (raw DOM mutation won't reach ProseMirror/React state). The logic mirrors
// claudeAdapter intentionally; only the input selector differs.
export const chatgptAdapter: PlatformAdapter = {
  id: "chatgpt",

  matches: (url) => {
    try {
      const host = new URL(url).hostname;
      return host === "chatgpt.com" || host === "chat.openai.com";
    } catch {
      return false;
    }
  },

  getInputElement: () =>
    document.querySelector<HTMLElement>(
      'div.ProseMirror#prompt-textarea[contenteditable="true"]'
    ) ??
    document.querySelector<HTMLElement>('#prompt-textarea[contenteditable="true"]') ??
    document.querySelector<HTMLElement>('[contenteditable="true"]'),

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
