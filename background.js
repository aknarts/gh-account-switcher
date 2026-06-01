chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["rules", "defaultAccount"], (result) => {
    if (!result.rules) {
      chrome.storage.sync.set({ rules: [], defaultAccount: null });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "status" && sender.tab) {
    const text = message.account ? message.account.slice(0, 3) : "";
    const color = message.matched ? "#2da44e" : "#6e7781";
    chrome.action.setBadgeText({ text, tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color, tabId: sender.tab.id });
  }
});
