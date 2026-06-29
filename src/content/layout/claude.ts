import { LayoutShiftAdapter } from "./base";

const PANEL_HOST_ID = "prompt-vault-root";

// Claude.ai is a React SPA whose flex layout (collapsible sidebar + central chat
// column) uses hashed class names, so we anchor on the semantic <main> element
// and climb to the viewport-spanning app root. Shrinking that root reflows the
// chat column left while leaving the sidebar untouched — no internal widths are
// hardcoded.
export class ClaudeLayoutAdapter extends LayoutShiftAdapter {
  readonly id = "claude";

  matches(url: string): boolean {
    try {
      return new URL(url).hostname === "claude.ai";
    } catch {
      return false;
    }
  }

  protected resolveTarget(): HTMLElement | null {
    const main = document.querySelector("main");
    if (main) {
      // Walk up to the outermost layout container directly under <body> so the
      // whole app shrinks and its flex children reflow.
      let el: HTMLElement = main;
      while (el.parentElement && el.parentElement !== document.body) {
        el = el.parentElement;
      }
      return el;
    }
    return this.positionalFallback();
  }

  // If <main> hasn't rendered yet, fall back to the widest direct child of
  // <body> that isn't our own panel host.
  private positionalFallback(): HTMLElement | null {
    let best: HTMLElement | null = null;
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.id === PANEL_HOST_ID) continue;
      if (!best || child.offsetWidth > best.offsetWidth) best = child;
    }
    return best;
  }
}
