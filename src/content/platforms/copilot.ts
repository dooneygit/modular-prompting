import type { PlatformAdapter } from "./types";

// Copilot's composer is a React-controlled <textarea id="userInput"> (not a
// contenteditable), so insertion follows the same path as Perplexity's textarea:
// set .value through the native setter and dispatch an `input` event, the way
// React's synthetic onChange expects. (Copilot also parks an offscreen
// autosize-mirror <textarea> without an id directly under <body> — we target
// #userInput so we never write into the mirror.)
export const copilotAdapter: PlatformAdapter = {
  id: "copilot",

  matches: (url) => {
    try {
      return new URL(url).hostname === "copilot.microsoft.com";
    } catch {
      return false;
    }
  },

  getInputElement: () =>
    document.querySelector<HTMLElement>("textarea#userInput") ??
    document.querySelector<HTMLElement>("main textarea"),

  insertText: (input, text) => {
    input.focus();

    if (input instanceof HTMLTextAreaElement) {
      // React tracks the textarea's value on the DOM node; assigning through the
      // native setter and firing `input` lets its onChange run so state stays in
      // sync. Splice at the caret (or the end when there's no selection).
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
    }
  },
};
