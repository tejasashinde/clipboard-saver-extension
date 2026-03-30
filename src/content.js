/**
 * Listens for the 'copy' event and stores the copied text in Chrome's local storage
 * if it hasn't been stored already. Each entry includes the text, the domain it was
 * copied from, and a color associated with that domain.
 *
 * @param {ClipboardEvent} e - The copy event.
 * @sideEffects Updates the 'clipboard' array in Chrome local storage.
*/
document.addEventListener('copy', async (e) => {
  try {
    const text = window.getSelection().toString().trim();
    if (!text) return;

    const domain = new URL(window.location.href).hostname;

    chrome.storage.local.get({ clipboard: [] }, (result) => {
      const clipboard = result.clipboard || [];

      const alreadyExists = clipboard.some(
        (item) => item.text === text
      );

      if (alreadyExists) return;

      const color = getDomainColor(domain);

      clipboard.push({ text, domain, color });
      chrome.storage.local.set({ clipboard });
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
