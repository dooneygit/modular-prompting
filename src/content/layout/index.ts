import { LayoutShiftAdapter } from "./base";
import { ClaudeLayoutAdapter } from "./claude";
import { ChatGptLayoutAdapter } from "./chatgpt";
import { PerplexityLayoutAdapter } from "./perplexity";
import { CopilotLayoutAdapter } from "./copilot";
import { GeminiLayoutAdapter } from "./gemini";

// One adapter per supported site. Claude, ChatGPT, Perplexity, and Copilot are
// implemented; Gemini is a placeholder that matches its host but no-ops until
// target detection lands.
const adapters: LayoutShiftAdapter[] = [
  new ClaudeLayoutAdapter(),
  new ChatGptLayoutAdapter(),
  new PerplexityLayoutAdapter(),
  new CopilotLayoutAdapter(),
  new GeminiLayoutAdapter(),
];

function resolveAdapter(): LayoutShiftAdapter | null {
  const url = window.location.href;
  return adapters.find((a) => a.matches(url)) ?? null;
}

// Singleton facade the panel drives: apply(width) when it opens/resizes,
// restore() when it closes or unmounts.
class LayoutShiftController {
  private adapter = resolveAdapter();

  apply(panelWidth: number): void {
    this.adapter?.apply(panelWidth);
  }

  restore(): void {
    this.adapter?.restore();
  }
}

export const layoutShift = new LayoutShiftController();
export { LayoutShiftAdapter } from "./base";
