import type { PlatformAdapter } from "./types";

// Perplexity's composer has shipped as both a controlled <textarea> and, more
// recently, a Lexical contenteditable. We resolve whichever exists: the textarea
// is React-controlled (so we set .value via the native setter and dispatch an
// input event, the way React's synthetic handler expects), while the
// contenteditable takes the same execCommand("insertText") path as Claude/ChatGPT
// (raw DOM mutation won't reach the editor's model).
export const perplexityAdapter: PlatformAdapter = {
  id: "perplexity",

  matches: (url) => {
    try {
      const host = new URL(url).hostname;
      return host === "www.perplexity.ai" || host === "perplexity.ai";
    } catch {
      return false;
    }
  },

  getInputElement: () =>
    document.querySelector<HTMLElement>('textarea[placeholder]') ??
    document.querySelector<HTMLElement>('main textarea') ??
    document.querySelector<HTMLElement>('[contenteditable="true"]'),

  insertText: (input, text, point) => {
    input.focus();

    if (input instanceof HTMLTextAreaElement) {
      // React tracks the textarea's value on the DOM node; assigning through the
      // native setter and firing `input` lets its onChange run so state stays in
      // sync. Splice at the caret (or the drop point's offset when available).
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const next = input.value.slice(0, start) + text + input.value.slice(end);
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(input, next);
      const caret = start + text.length;
      input.setSelectionRange(caret, caret);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

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
