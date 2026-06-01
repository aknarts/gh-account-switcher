(async () => {
  if (window.self !== window.top) return;

  const COOLDOWN_MS = 5000;
  let lastSwitchTime = 0;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "getStatus") {
      const account = getMetaContent("user-login");
      sendResponse({ account: account || null });
    }
    if (msg.type === "getAccounts") {
      const nonce = getMetaContent("fetch-nonce");
      const current = getMetaContent("user-login");
      if (!nonce || !current) {
        sendResponse({ current: null, stashed: [] });
        return true;
      }
      fetch("https://github.com/_side-panels/user.json", {
        headers: {
          accept: "application/json",
          "x-requested-with": "XMLHttpRequest",
          "github-verified-fetch": "true",
          "x-fetch-nonce": nonce,
        },
        credentials: "same-origin",
      })
        .then((r) => r.json())
        .then((data) => {
          sendResponse({
            current,
            stashed: (data.stashedAccounts || []).map((a) => ({
              login: a.login,
              name: a.name,
              avatarUrl: a.avatarUrl,
              sessionId: a.userSessionId,
            })),
          });
        })
        .catch(() => sendResponse({ current, stashed: [] }));
      return true;
    }
    if (msg.type === "switchTo") {
      const nonce = getMetaContent("fetch-nonce");
      if (!nonce) {
        sendResponse({ ok: false });
        return true;
      }
      const formData = new FormData();
      formData.append("user_session_id", msg.sessionId.toString());
      formData.append("from", "nav_panel");
      fetch("https://github.com/switch_account", {
        method: "POST",
        headers: {
          "github-verified-fetch": "true",
          "x-requested-with": "XMLHttpRequest",
          accept: "application/json",
          "x-fetch-nonce": nonce,
        },
        body: formData,
        credentials: "same-origin",
      })
        .then((r) => {
          sendResponse({ ok: r.ok });
          if (r.ok) location.reload();
        })
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
  });

  await checkAndSwitch();

  document.addEventListener("turbo:render", () => checkAndSwitch());
  document.addEventListener("turbo:load", () => checkAndSwitch());

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      checkAndSwitch();
    }
  }).observe(document.querySelector("head"), { childList: true, subtree: true });

  async function checkAndSwitch() {
    if (Date.now() - lastSwitchTime < COOLDOWN_MS) return;

    const currentAccount = getMetaContent("user-login");
    if (!currentAccount) return;

    const url = new URL(window.location.href);
    const targetAccount = await getTargetAccount(url);

    if (!targetAccount || targetAccount === currentAccount) {
      chrome.runtime.sendMessage({
        type: "status",
        account: currentAccount,
        matched: !!targetAccount,
      });
      return;
    }

    console.log(
      `[GH Switcher] Wrong account: have "${currentAccount}", need "${targetAccount}". Switching...`
    );

    const switched = await performSwitch(targetAccount);
    if (switched) {
      lastSwitchTime = Date.now();
      window.location.reload();
    }
  }

  function getMetaContent(name) {
    const el = document.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute("content") : null;
  }

  const GITHUB_SYSTEM_PATHS = new Set([
    "settings", "notifications", "dashboard", "pulls", "issues",
    "explore", "trending", "new", "login", "logout", "signup",
    "features", "marketplace", "sponsors", "codespaces", "copilot",
    "stars", "watching", "collections", "topics", "events",
    "account", "sessions", "password_reset", "enterprises",
    "organizations", "apps", "pages",
  ]);

  async function getTargetAccount(url) {
    const { rules = [], defaultAccount = null } = await chrome.storage.sync.get([
      "rules",
      "defaultAccount",
    ]);

    for (const rule of rules) {
      if (matchRule(rule, url)) return rule.account;
    }

    const firstSegment = url.pathname.split("/").filter(Boolean)[0];
    if (!firstSegment || GITHUB_SYSTEM_PATHS.has(firstSegment)) return null;

    return defaultAccount;
  }

  function matchRule(rule, url) {
    const path = url.pathname;
    const params = url.searchParams;

    switch (rule.type) {
      case "org": {
        const firstSegment = path.split("/").filter(Boolean)[0];
        const orgsMatch = path.match(/^\/orgs\/([^/]+)/);
        return (
          firstSegment === rule.value ||
          (orgsMatch && orgsMatch[1] === rule.value)
        );
      }
      case "page_id":
        return params.get("page_id") === rule.value;
      case "path_prefix":
        return path.startsWith(rule.value);
      case "regex":
        try {
          return new RegExp(rule.value).test(url.href);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  async function performSwitch(targetLogin) {
    const nonce = getMetaContent("fetch-nonce");
    if (!nonce) {
      console.error("[GH Switcher] No fetch-nonce found");
      return false;
    }

    const sessionId = await getSessionIdForAccount(targetLogin, nonce);
    if (!sessionId) {
      console.error(
        `[GH Switcher] Account "${targetLogin}" not in stashed accounts`
      );
      return false;
    }

    const formData = new FormData();
    formData.append("user_session_id", sessionId.toString());
    formData.append("from", "nav_panel");

    const response = await fetch("https://github.com/switch_account", {
      method: "POST",
      headers: {
        "github-verified-fetch": "true",
        "x-requested-with": "XMLHttpRequest",
        accept: "application/json",
        "x-fetch-nonce": nonce,
      },
      body: formData,
      credentials: "same-origin",
    });

    if (!response.ok) {
      console.error(`[GH Switcher] Switch failed: ${response.status}`);
      return false;
    }

    console.log(`[GH Switcher] Switched to "${targetLogin}"`);
    return true;
  }

  async function getSessionIdForAccount(login, nonce) {
    const response = await fetch("https://github.com/_side-panels/user.json", {
      headers: {
        accept: "application/json",
        "x-requested-with": "XMLHttpRequest",
        "github-verified-fetch": "true",
        "x-fetch-nonce": nonce,
      },
      credentials: "same-origin",
    });

    if (!response.ok) return null;

    const data = await response.json();
    const account = (data.stashedAccounts || []).find((a) => a.login === login);
    return account ? account.userSessionId : null;
  }
})();
