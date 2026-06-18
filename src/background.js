/**
 * Initializes storage only for a fresh install.
 * Updates must never wipe an existing clipboard history.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'install') return;
  chrome.storage.local.set({ clipboard: [] });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'SAVE_CLIPBOARD_ENTRY') return;

  chrome.storage.local.get(
    {
      clipboard: [],
      clipboardSettings: { retentionRule: 'all' },
    },
    (result) => {
      const clipboard = Array.isArray(result.clipboard) ? result.clipboard : [];
      const settings = result.clipboardSettings || { retentionRule: 'all' };
      const nextEntries = applyRetentionRule(clipboard, settings.retentionRule);

      if (message.entry && !isDuplicateEntry(nextEntries, message.entry)) {
        nextEntries.push(message.entry);
      }

      chrome.storage.local.set({ clipboard: nextEntries }, () => {
        sendResponse({ ok: true });
      });
    }
  );

  return true;
});

function applyRetentionRule(entries, ruleKey) {
  const rule = getRetentionRule(ruleKey);
  let nextEntries = entries.slice();

  if (rule.maxAgeDays) {
    const cutoff = Date.now() - rule.maxAgeDays * 24 * 60 * 60 * 1000;
    nextEntries = nextEntries.filter((entry) => {
      const copiedAt = entry.copiedAt ? new Date(entry.copiedAt).getTime() : 0;
      return !copiedAt || copiedAt >= cutoff;
    });
  }

  if (rule.keepCount) {
    nextEntries = nextEntries
      .slice()
      .sort((a, b) => {
        const aTime = a.copiedAt ? new Date(a.copiedAt).getTime() : 0;
        const bTime = b.copiedAt ? new Date(b.copiedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, rule.keepCount);
  }

  return nextEntries;
}

function isDuplicateEntry(entries, candidate) {
  return entries.some((entry) => (
    entry.text === candidate.text &&
    entry.domain === candidate.domain &&
    entry.sourceUrl === candidate.sourceUrl
  ));
}

function getRetentionRule(ruleKey) {
  switch (ruleKey) {
    case 'days-7':
      return { maxAgeDays: 7 };
    case 'days-30':
      return { maxAgeDays: 30 };
    case 'days-90':
      return { maxAgeDays: 90 };
    case 'all':
    default:
      return {};
  }
}
