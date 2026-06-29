import { LayoutShiftAdapter } from "./base";

const APP_ROOT_ID = "root";

// Claude.ai is a React SPA. Its whole app (collapsible sidebar + chat column)
// renders inside a single mount node, `div#root`, and the chat column is centered
// within it — so shrinking #root's width reflows the column left. We must target
// #root *deterministically*: Claude also keeps a separate full-viewport-width
// overlay/portal div as a sibling under <body>, so any "widest body child"
// heuristic flips onto that overlay on re-render and the real shift is lost.
//
// There is no <main> tag — the chat region is a plain div with role="main" — so
// we anchor on that semantic role and climb to the body-level app root, falling
// back to #root by id.
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
    const main = document.querySelector<HTMLElement>('[role="main"]');
    if (main) {
      // Climb to the element directly under <body> — the app root that holds
      // both the sidebar and the chat column.
      let el: HTMLElement = main;
      while (el.parentElement && el.parentElement !== document.body) {
        el = el.parentElement;
      }
      return el;
    }
    return document.getElementById(APP_ROOT_ID);
  }
}
