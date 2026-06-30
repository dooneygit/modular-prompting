import { LayoutShiftAdapter } from "./base";

// ChatGPT (chatgpt.com / chat.openai.com) is a Next.js SPA. Its app mounts in a
// plain <div> directly under <body>, and that root's child is a `w-screen` flex
// container holding the left sidebar and the chat column as flex siblings.
//
// Unlike Claude — where shrinking the body-level app root reflows everything —
// we must shrink *that* `w-screen` container itself, not the body-level root:
// the container pins its width to 100vw via `w-screen`, so shrinking an ancestor
// leaves it overflowing to the right, back under the panel. Overriding its width
// (the shared buildCss rule beats `w-screen`) lets the flex-1 chat column reflow
// left while the fixed-width sidebar stays put.
//
// We anchor on the semantic <main id="main"> and climb to the element one level
// below <body> (the body-level root's child = the `w-screen` wrapper). Structural
// resolution survives the utility/hashed class churn between ChatGPT releases.
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
    const main = document.querySelector<HTMLElement>("#main, main");
    if (!main) return null;
    // Climb until we reach the element directly under <body> (the app root),
    // keeping the element one level below it — the w-screen wrapper to shrink.
    let el: HTMLElement = main;
    let prev: HTMLElement = main;
    while (el.parentElement && el.parentElement !== document.body) {
      prev = el;
      el = el.parentElement;
    }
    return prev;
  }
}
