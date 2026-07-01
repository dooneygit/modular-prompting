import { LayoutShiftAdapter } from "./base";

const APP_ROOT_ID = "root";

// Perplexity (www.perplexity.ai) is a React SPA mounting in `div#root`. Below it,
// a flex row (`div.flex.size-full.flex-1`) holds the left `<nav>` sidebar and the
// chat `<main>` as flex siblings; `main` carries `min-w-0 grow`, so it reflows into
// whatever width is left. No element pins itself to 100vw (unlike ChatGPT's
// `w-screen` wrapper), so — as with Claude — shrinking the body-level app root
// cascades down: the sidebar stays pinned left and the chat column narrows from the
// right, clearing the panel's column. Perplexity's own right-side drawer is a
// separate `position:fixed` body child outside this flow, and we anchor on the
// semantic `<main>` rather than a "widest child" heuristic, so it never becomes the
// target.
//
// The chat region is a real `<main>` tag (no role attribute), so we anchor on it and
// climb to the element directly under <body> (the app root), falling back to #root
// by id. Structural resolution survives Perplexity's hashed utility-class churn.
export class PerplexityLayoutAdapter extends LayoutShiftAdapter {
  readonly id = "perplexity";

  matches(url: string): boolean {
    try {
      const host = new URL(url).hostname;
      return host === "www.perplexity.ai" || host === "perplexity.ai";
    } catch {
      return false;
    }
  }

  protected resolveTarget(): HTMLElement | null {
    const main = document.querySelector<HTMLElement>("main");
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
