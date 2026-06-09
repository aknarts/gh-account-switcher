# GitHub Account Switcher - Chrome Extension

Automatically switches your GitHub account based on configurable URL rules, leveraging GitHub's built-in multi-account session support.

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this folder
4. Click the extension icon → **Open Settings** to configure rules

## Configuration

Open the extension options page to set up:

- **Default Account** — fallback when no rule matches
- **Rules** — ordered list (first match wins), each with:
  - **Type**: `org`, `page_id`, `path_prefix`, or `regex`
  - **Value**: the match pattern
  - **Account**: GitHub login to switch to

### Rule Types

| Type | Value Example | Matches |
|------|--------------|---------|
| `org` | `my-org` | `github.com/my-org/*` and `github.com/orgs/my-org/*` |
| `page_id` | `12345678` | `github.com/pages/auth?page_id=12345678` |
| `path_prefix` | `/username` | Any path starting with `/username` |
| `regex` | `github\\.com/special-.*` | Full URL regex match |

## Prerequisites

You must have multiple accounts added to GitHub's account switcher (Profile → Switch account → Add account) before this extension can switch between them.

## Release

Pushing a `v*` tag whose version matches `manifest.json` creates a GitHub release and packages the extension ZIP.

Chrome Web Store upload is currently manual: download the ZIP from the GitHub release and upload it in the Chrome Web Store Developer Dashboard.

## How It Works

On each GitHub page load (including SPA navigations):

1. Reads active account from page metadata
2. Matches current URL against configured rules
3. If wrong account is active, calls GitHub's internal switch API
4. Reloads the page on the correct account
