document.getElementById("settings").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
});

const accountsContainer = document.getElementById("accounts");

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;
  const tab = tabs[0];

  if (!tab.url || !tab.url.startsWith("https://github.com")) {
    accountsContainer.textContent = "Not on GitHub";
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "getAccounts" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      accountsContainer.textContent = "Extension not active on this page";
      return;
    }

    renderAccounts(tab.id, response.current, response.stashed);
  });
});

function renderAccounts(tabId, current, stashed) {
  if (current) {
    accountsContainer.appendChild(
      createAccountItem({ login: current, active: true })
    );
  }

  stashed.forEach((account) => {
    const item = createAccountItem({
      login: account.login,
      name: account.name,
      avatarUrl: account.avatarUrl,
      active: false,
    });
    item.addEventListener("click", () => {
      item.style.opacity = "0.5";
      item.style.pointerEvents = "none";
      chrome.tabs.sendMessage(tabId, {
        type: "switchTo",
        sessionId: account.sessionId,
      });
      setTimeout(() => window.close(), 500);
    });
    accountsContainer.appendChild(item);
  });
}

function createAccountItem({ login, name, avatarUrl, active }) {
  const item = document.createElement("div");
  item.className = "account-item" + (active ? " active" : "");

  if (avatarUrl) {
    const img = document.createElement("img");
    img.className = "account-avatar";
    img.src = avatarUrl;
    item.appendChild(img);
  }

  const info = document.createElement("div");
  info.className = "account-info";
  const loginEl = document.createElement("div");
  loginEl.className = "account-login";
  loginEl.textContent = login;
  info.appendChild(loginEl);
  if (name) {
    const nameEl = document.createElement("div");
    nameEl.className = "account-name";
    nameEl.textContent = name;
    info.appendChild(nameEl);
  }
  item.appendChild(info);

  if (active) {
    const badge = document.createElement("div");
    badge.className = "account-badge";
    badge.textContent = "active";
    item.appendChild(badge);
  }

  return item;
}
