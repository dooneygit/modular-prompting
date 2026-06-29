import { LayoutShiftAdapter } from "./base";

// Placeholder — layout shift for ChatGPT is not implemented yet. matches() is
// wired up so the registry recognises the site; resolveTarget() returning null
// makes apply() a clean no-op until target detection is added.
export class ChatGptLayoutAdapter extends LayoutShiftAdapter {
  readonly id = "chatgpt";

  matches(url: string): boolean {
    try {
      const host = new URL(url).hostname;
      return host === "chatgpt.com" || host === "chat.openai.com";
    } catch {
      return false;
    }
  }

  protected resolveTarget(): HTMLElement | null {
    return null; // TODO: detect ChatGPT's chat content container.
  }
}
