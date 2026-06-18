/**
 * Listens for the 'copy' event and stores each copied selection as a clipboard
 * history item in Chrome's local storage. Each entry includes the text, source
 * domain, source URL, timestamp, and a color associated with that domain.
 *
 * @param {ClipboardEvent} e - The copy event.
 * @sideEffects Updates the 'clipboard' array in Chrome local storage.
*/
document.addEventListener('copy', async (e) => {
  try {
    const text = window.getSelection().toString().trim();
    if (!text) return;

    const runtime = globalThis.chrome && chrome.runtime;
    if (!runtime || typeof runtime.sendMessage !== 'function') {
      return;
    }

    const domain = new URL(window.location.href).hostname;
    const sourceUrl = window.location.href;
    const copiedAt = new Date().toISOString();
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    runtime.sendMessage({
      type: 'SAVE_CLIPBOARD_ENTRY',
      entry: {
        id,
        text,
        domain,
        sourceUrl,
        color: getDomainColor(domain),
        copiedAt,
      },
    }, () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        console.warn('Clipboard capture failed:', chrome.runtime.lastError.message);
      }
    });
  } catch (err) {
    console.error("Clipboard capture failed", err);
  }
});

/**
 * Generates a consistent background color for a given domain.
 * The same domain will always get the same color from the predefined palette.
 *
 * @param {string} domain - The domain name to hash.
 * @returns {string} A hex color code from the color palette.
*/
function getDomainColor(domain) {
  const colors = [
    "#e3f2fd", "#fce4ec", "#e8f5e9", "#fff3e0", "#ede7f6",
    "#f3e5f5", "#e0f7fa", "#f1f8e9", "#fbe9e7", "#e1f5fe",
    "#f9fbe7", "#ede7f6", "#ffebee", "#e8eaf6", "#e0f2f1",
    "#f3f3f3", "#ffecb3", "#c8e6c9", "#f0f4c3", "#d1c4e9"
  ];

  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
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
