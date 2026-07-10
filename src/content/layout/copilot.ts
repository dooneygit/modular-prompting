import { LayoutShiftAdapter } from "./base";

const APP_ROOT_ID = "app";

// Copilot (copilot.microsoft.com) is a React SPA mounting in `div#app`. Below it,
// a flex row (`div.flex.h-full.overflow-hidden`) holds the left sidebar and the
// chat `<main>` as flex siblings; `main` carries `w-full min-w-0`, so it reflows
// into whatever width is left. No element pins itself to 100vw (unlike ChatGPT's
// `w-screen` wrapper), so — as with Claude and Perplexity — shrinking the
// body-level app root cascades down: the sidebar stays pinned left and the chat
// column narrows from the right, clearing the panel's column. Copilot's offscreen
// autosize-mirror <textarea> is a separate absolutely-positioned body child
// outside this flow, and we anchor on the semantic `<main>` rather than a
// "widest child" heuristic, so it never becomes the target.
//
// The chat region is a real `<main>` tag (no role attribute), so we anchor on it
// and climb to the element directly under <body> (the app root), falling back to
// #app by id. Structural resolution survives Copilot's hashed utility-class churn.
export class CopilotLayoutAdapter extends LayoutShiftAdapter {
  readonly id = "copilot";

  matches(url: string): boolean {
    try {
      return new URL(url).hostname === "copilot.microsoft.com";
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
