# Clipboard Saver — Effortless Ctrl+C Grabber for Chrome

Clipboard Saver is a Chrome extension for saving copied text locally as you browse. It captures clipboard selections, keeps them organized by domain, and lets you search, edit, filter, bulk-manage, and export entries from the popup.

<p align="center"><img src="./demo.gif" alt="Clipboard Saver demo"/><br/></p>

## What It Does

- Captures copied text from webpages and stores it in `chrome.storage.local`.
- Skips duplicate captures with the same text, domain, and source URL.
- Keeps your history searchable, sortable, and filterable by domain.
- Supports per-entry copy, edit, and delete actions.
- Supports bulk selection for copying or deleting many items at once.
- Exports history as TXT or CSV.
- Offers retention rules so old entries can be cleaned up automatically.
- Stores everything locally in the browser, with no external sync service.

## Popup Features

- Search bar for fast lookup across text, domain, source URL, and timestamps.
- Domain filter with per-domain counts.
- Sort controls for newest, oldest, domain A-Z, and domain Z-A.
- Bulk mode with select visible, copy selected, delete selected, and done actions.
- Entry cards with source domain, timestamp, content preview, and quick actions.
- Empty-state message when no entries exist yet.
- Export section for choosing TXT or CSV before download.
- Clear button for wiping saved clipboard history.

## Settings

Open the gear icon in the popup to access Settings.

- Theme toggle for light or dark mode.
- Retention rules:
  - Keep all
  - Keep 7 days
  - Keep 30 days
  - Keep 90 days
- Cleanup button to apply the current retention rule immediately.
- Privacy note confirming data stays on your machine.
- Shortcut reference table for popup actions.

## Keyboard Shortcuts

- `Ctrl+Shift+Y` opens the extension popup.
- `/` focuses the search box when you are not typing in a field.
- `Ctrl+K` focuses the search box.
- `Ctrl+Shift+A` toggles bulk mode.
- `Esc` closes Settings, exits bulk mode, or clears search depending on context.

## How It Works

1. Select text on any webpage.
2. Copy it normally with `Ctrl+C`.
3. Clipboard Saver captures the copied selection and stores it locally.
4. Open the popup to search, edit, filter, export, or clean up entries.

## Installation

Clipboard Saver is not on the Chrome Web Store. Install it manually by loading the unpacked extension.

### Step 1: Download the Extension

**Option A - Clone with Git:**  

```bash
git clone https://github.com/tejasashinde/clipboard-saver-extension
```

**Option B - Download ZIP:**

1. Download the ZIP from this repository.
2. Extract the zip to a folder on your computer (e.g., ~/clipboard-saver).

### Step 2: Open Chrome Extensions Page

1. Open Chrome.
2. Type `chrome://extensions` in the address bar and press Enter.
3. Enable Developer mode using the toggle in the top-right corner.

### Step 3: Load the Extension

1. Click Load unpacked in the top-left.
2. Navigate to the clipboard-saver folder you downloaded.
3. Select the folder (the one containing manifest.json) and click Open.
4. The Clipboard Saver icon should appear in your browser toolbar. If it is hidden, click the puzzle piece icon and pin Clipboard Saver.

### Step 4: Start Grabbing Text

1. Copy any text on a webpage using `Ctrl+C`.
2. Open the Clipboard Saver popup to review your saved entries.
3. Search, edit, filter, bulk-manage, export, or clean the list as needed.

## Updating

If you pull or download a new version, go to `chrome://extensions` and click Reload on the Clipboard Saver card, or click Load unpacked again and select the same folder.

## Uninstalling

Go to `chrome://extensions`, find Clipboard Saver, and click Remove.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for new features, bug fixes, or improvements.

## License

MIT License — see the [LICENSE](LICENSE) file for details.
