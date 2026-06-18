# Clipboard Saver Smoke Checklist

Run these checks after editing the extension or bumping the version.

## Fresh install

- Load the unpacked extension in Chrome.
- Confirm the popup opens without console errors.
- Confirm the history starts empty and the search box is hidden.

## Capture flow

- Select text on a page and press `Ctrl+C`.
- Confirm the popup shows a new entry with the source domain and timestamp.
- Copy the same text again and confirm a second history item is stored.

## Search and edit

- Search for part of a clipboard entry.
- Filter entries by domain and confirm the list updates.
- Change the sort order and confirm the order changes without losing state.
- Double-click the filtered result and update the text.
- Confirm the change persists after closing and reopening the popup.

## Bulk actions and cleanup

- Toggle bulk select mode and confirm checkboxes appear on entries.
- Select multiple entries and confirm copy and delete work for the selection.
- Change the retention rule and confirm cleanup prunes old entries when requested.
- Confirm `Ctrl+Shift+Y` opens the extension popup and `/` or `Ctrl+K` focuses search inside the popup.

## Remove and clear

- Remove a single entry from a filtered list.
- Clear the full history and confirm the empty state returns.

## Export

- Export as TXT and verify the file downloads with the expected text.
- Export as CSV and verify the file includes `Captured At`, `Domain`, `Source URL`, and `Text`.

## Upgrade safety

- Reload the extension from `chrome://extensions`.
- Confirm the existing clipboard history is still present after the update.
