import { LayoutShiftAdapter } from "./base";

// Placeholder — layout shift for Gemini is not implemented yet. See
// ChatGptLayoutAdapter for the same rationale.
export class GeminiLayoutAdapter extends LayoutShiftAdapter {
  readonly id = "gemini";

  matches(url: string): boolean {
    try {
      return new URL(url).hostname === "gemini.google.com";
    } catch {
      return false;
    }
  }

  protected resolveTarget(): HTMLElement | null {
    return null; // TODO: detect Gemini's chat content container.
  }
}
