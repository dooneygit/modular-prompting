chrome.runtime.onInstalled.addListener(() => {
  console.log("[Prompt Vault] Extension installed.");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "ping") {
    sendResponse({ type: "pong" });
  }
  return true;
});
