export function isFullscreenView(): boolean {
  return new URLSearchParams(window.location.search).get("view") === "tab";
}

export function openFullscreenTab(): void {
  const base =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("popup.html")
      : "popup.html";
  window.open(`${base}?view=tab`, "_blank");
}
