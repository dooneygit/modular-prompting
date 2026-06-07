export interface DropPoint {
  x: number;
  y: number;
}

// One adapter per supported AI chat platform. Adding a new site means adding
// an adapter and registering it — core drop/panel logic stays untouched.
export interface PlatformAdapter {
  id: string;
  /** Whether this adapter handles the given page URL. */
  matches(url: string): boolean;
  /**
   * Resolve the chat input element fresh on each call — platforms re-render
   * their input on navigation, so cached references go stale.
   */
  getInputElement(): HTMLElement | null;
  /** Insert text into the input at the drop point (or current caret). */
  insertText(input: HTMLElement, text: string, point?: DropPoint): void;
}
