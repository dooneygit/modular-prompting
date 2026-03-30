// Content script — runs in the context of web pages.
// Communicates with the background service worker via chrome.runtime.sendMessage.

chrome.runtime.sendMessage({ type: "ping" }, (response) => {
  if (chrome.runtime.lastError) return;
  console.log("[Prompt Vault] Background response:", response);
});
