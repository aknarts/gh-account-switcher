document.getElementById("settings").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;
  const tab = tabs[0];
  const dot = document.getElementById("dot");
  const account = document.getElementById("account");
  const meta = document.getElementById("meta");

  if (!tab.url || !tab.url.startsWith("https://github.com")) {
    meta.textContent = "Not on GitHub";
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "getStatus" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      meta.textContent = "Extension not active on this page";
      return;
    }
    if (response.account) {
      account.textContent = response.account;
      dot.classList.remove("dot-none");
      dot.classList.add("dot-match");
      meta.textContent = "Active account";
    }
  });
});
