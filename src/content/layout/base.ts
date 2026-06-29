// Multi-site layout-shift system. The mechanism — inject a <style> tag, mark a
// target element via our own data attribute, and reapply across SPA re-renders
// with a MutationObserver — is shared. Only *which* element to shrink (and, if
// needed, the CSS rule) varies per site, so that lives in subclasses.

const PANEL_WIDTH_VAR = "--pv-panel-width";
const MARKER_ATTR = "data-pv-shift";
const STYLE_ID = "pv-layout-shift-style";

export abstract class LayoutShiftAdapter {
  abstract readonly id: string;

  /** Whether this adapter handles the given page URL. */
  abstract matches(url: string): boolean;

  /**
   * Resolve the host element whose width should shrink to make room for the
   * panel. Re-resolved on every (re)apply since SPAs swap the node on navigation.
   * Return null when no suitable target exists (e.g. unimplemented site).
   */
  protected abstract resolveTarget(): HTMLElement | null;

  private width = 0;
  private active = false;
  private observer: MutationObserver | null = null;
  private pending = false;

  /** Shift the host layout left by `panelWidth` px. Idempotent. */
  apply(panelWidth: number): void {
    this.width = panelWidth;
    this.active = true;
    this.reapply();
    this.observe();
  }

  /** Restore the host layout, undoing every DOM/style change this adapter made. */
  restore(): void {
    this.active = false;
    this.pending = false;
    this.observer?.disconnect();
    this.observer = null;
    document.documentElement.style.removeProperty(PANEL_WIDTH_VAR);
    document.getElementById(STYLE_ID)?.remove();
    document
      .querySelectorAll(`[${MARKER_ATTR}]`)
      .forEach((el) => el.removeAttribute(MARKER_ATTR));
  }

  // Re-assert every piece of state a re-render may have discarded: the width
  // variable (on <html>, which React doesn't own), the <head> <style> tag, and
  // the marker on the freshly re-queried target. Each step is a no-op when
  // already in place, so this is cheap to run on every mutation tick.
  private reapply(): void {
    if (!this.active) return;
    document.documentElement.style.setProperty(
      PANEL_WIDTH_VAR,
      `${this.width}px`
    );
    this.ensureStyle();
    this.mark();
  }

  /**
   * The shift rule, keyed on our marker attribute so it never depends on the
   * host's hashed class names. Shrinking the marked element's width (rather than
   * adding right padding) makes its flex children reflow into the smaller space,
   * leaving the panel's column on the right uncovered. Override per site if a
   * different rule is required.
   */
  protected buildCss(): string {
    return (
      `[${MARKER_ATTR}]{` +
      `width:calc(100vw - var(${PANEL_WIDTH_VAR}))!important;` +
      `max-width:calc(100vw - var(${PANEL_WIDTH_VAR}))!important;` +
      `transition:width .2s ease,max-width .2s ease;}`
    );
  }

  // A <style> in <head> survives React re-renders that would otherwise reset
  // inline styles on the target node.
  private ensureStyle(): void {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = this.buildCss();
  }

  private mark(): void {
    const target = this.resolveTarget();
    // Drop markers left on stale nodes from a previous render before tagging the
    // current target, so at most one element carries the shift.
    document.querySelectorAll(`[${MARKER_ATTR}]`).forEach((el) => {
      if (el !== target) el.removeAttribute(MARKER_ATTR);
    });
    if (target && !target.hasAttribute(MARKER_ATTR)) {
      target.setAttribute(MARKER_ATTR, "");
    }
  }

  // React re-renders (editing a message, a streaming reply, switching models)
  // can override the container's layout, drop our <style> tag, or unmount and
  // remount the wrapper entirely — orphaning the marker. Observing the whole
  // body subtree (never a specific node, which would detach silently when
  // replaced) lets us re-query and re-assert after any of these.
  private observe(): void {
    if (this.observer) return;
    this.observer = new MutationObserver(() => {
      if (!this.active || this.pending) return;
      // A single React commit emits a burst of mutations. Coalesce them into one
      // reapply scheduled on a microtask: it runs after the commit settles but
      // before the browser paints, so the shift is restored without a recentering
      // flicker. We never cache the target — reapply() re-queries it each time.
      this.pending = true;
      queueMicrotask(() => {
        this.pending = false;
        this.reapply();
      });
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }
}
