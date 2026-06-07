import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import css from "../../popup/index.css?inline";
import { InPagePanel } from "./InPagePanel";
import type { PlatformAdapter } from "../platforms/types";

const HOST_ID = "prompt-vault-root";
const FONT_LINKS = [
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap",
];

let root: Root | null = null;
let host: HTMLElement | null = null;

// @font-face loaded on the document is available inside the shadow tree, so the
// panel's Inter text and Material Symbols icons render correctly.
function ensureFonts(): void {
  for (const href of FONT_LINKS) {
    if (document.head.querySelector(`link[href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

export function mountPanel(adapter: PlatformAdapter): void {
  if (root) return;
  ensureFonts();

  host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;";
  document.body.appendChild(host);

  // Shadow DOM isolates the panel's styles from the host page (and vice versa),
  // so Tailwind's preflight can't touch Claude's UI.
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  shadow.appendChild(style);

  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  root = createRoot(mountPoint);
  root.render(
    <StrictMode>
      <InPagePanel adapter={adapter} />
    </StrictMode>
  );
}

export function unmountPanel(): void {
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}
