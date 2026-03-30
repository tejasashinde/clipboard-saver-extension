let allEntries = [];

/**
 * Updates the visibility of the main button bar and search box
 * based on whether there are entries in the clipboard stored in Chrome local storage.
 * Hides the elements if the clipboard is empty; shows them otherwise.
*/
function updateButtonVisibility() {
  chrome.storage.local.get({ clipboard: [] }, (result) => {
    const clipboard = result.clipboard || [];
    const buttonBar = document.querySelector('.button-bar');
    const searchBoxDiv = document.querySelector('#searchBox');

    if (clipboard.length === 0) {
      buttonBar.style.display = 'none';
      searchBoxDiv.style.display = 'none';
    } else {
      buttonBar.style.display = 'flex';
      searchBoxDiv.style.display = 'flex';
    }
  });
}

/**
 * Triggers a file download with the given content and filename.
 * @param {string} content - The content to write into the file.
 * @param {string} filename - The name of the file to be downloaded.
 * @param {string} [type='text/plain'] - The MIME type of the file.
*/
function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Updates the visibility of the edit tip based on whether there are any entries
 * in the global allEntries array. Shows the tip if entries exist, hides it otherwise.
*/
function updateTipVisibility() {
  const tipDiv = document.getElementById('editTip');
  if (!tipDiv) return;
  tipDiv.style.display = allEntries.length > 0 ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  updateButtonVisibility();

  const container = document.getElementById('clipboardContainer');
  const searchBox = document.getElementById('searchBox');
  const clearBtn = document.getElementById('clearClipboard');
  const exportBtn = document.getElementById('exportClipboard');
  const formatSelect = document.getElementById('downloadFormat');

  // Tip element
  let tipDiv = document.createElement('div');
  tipDiv.id = 'editTip';
  tipDiv.style.fontSize = '12px';
  tipDiv.style.color = '#555';
  tipDiv.style.marginBottom = '8px';
  tipDiv.style.display = 'none';
  tipDiv.textContent = '💡 Tip: Double-click an entry to edit it.';
  searchBox.insertAdjacentElement('afterend', tipDiv);

  chrome.storage.local.get({ clipboard: [] }, (result) => {
    allEntries = result.clipboard || [];
    renderEntries(allEntries);

    // Show tip if entries exist
    tipDiv.style.display = allEntries.length > 0 ? 'block' : 'none';
  });

  searchBox.addEventListener('input', () => {
    const keyword = searchBox.value.toLowerCase();
    const filtered = allEntries.filter(e => e.text.toLowerCase().includes(keyword));
    renderEntries(filtered);

    // Show tip only if filtered results exist
    tipDiv.style.display = filtered.length > 0 ? 'block' : 'none';
  });

  chrome.storage.local.get({ clipboard: [] }, (result) => {
    allEntries = result.clipboard || [];
    renderEntries(allEntries);
  });

  // Search box
  searchBox.addEventListener('input', () => {
    const keyword = searchBox.value.toLowerCase();
    const filtered = allEntries.filter(e => e.text.toLowerCase().includes(keyword));
    renderEntries(filtered);
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm("This will delete all clipboard entries. Are you sure?")) return;

    chrome.storage.local.set({ clipboard: [] }, () => {
      allEntries = [];
      renderEntries([]);
      updateButtonVisibility();
      document.getElementById('clipboardContainer').textContent =
        'No entries yet. Select any text and press Ctrl+C to add it here.';
      updateTipVisibility();
    });
  });

  // Export button
  exportBtn.addEventListener('click', () => {
    if (allEntries.length === 0) return;

    const format = formatSelect.value;

    if (format === 'txt') {
      const content = allEntries
        .map(e => `[${e.domain}]\n${e.text}`)
        .join('\n\n');

      downloadFile(content, 'clipboard-history.txt', 'text/plain');
    } else if (format === 'csv') {

      const header = ['Domain', 'Text'];
      const escapeCsv = (text) => `"${text.replace(/"/g, '""')}"`;
      const rows = allEntries.map(e =>
        [escapeCsv(e.domain), escapeCsv(e.text)].join(',')
      );
      const csvContent = [header.join(','), ...rows].join('\n');
      downloadFile(csvContent, 'clipboard-history.csv', 'text/csv');
    }
  });

  // Render Entries function
  function renderEntries(entries) {
    container.innerHTML = '';

    if (entries.length === 0) {
      container.textContent = 'No entries yet. Select any text and press Ctrl+C to add it here.';
      return;
    }

    entries.slice().reverse().forEach((entry, index) => {
      const outerIndex = allEntries.length - 1 - index;

      const wrapper = document.createElement('div');
      wrapper.className = 'clipboard-entry';
      wrapper.style.backgroundColor = entry.color;

      const textDiv = document.createElement('div');
      textDiv.textContent = entry.text;
      textDiv.title = `From: ${entry.domain}`;

      // COPY on single click (unchanged)
      textDiv.addEventListener('click', () => {
        navigator.clipboard.writeText(entry.text);
      });

      // EDIT on double click
      textDiv.addEventListener('dblclick', () => {
        wrapper.innerHTML = '';

        const textarea = document.createElement('textarea');
        textarea.value = entry.text;
        textarea.className = 'edit-box';

        const updateBtn = document.createElement('button');
        updateBtn.textContent = 'Update';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';

        // Apply styles
        updateBtn.className = 'edit-btn update';
        cancelBtn.className = 'edit-btn cancel';

        const actions = document.createElement('div');
        actions.className = 'edit-actions';
        actions.appendChild(updateBtn);
        actions.appendChild(cancelBtn);

        // Update logic
        const saveChanges = () => {
          const newText = textarea.value.trim();
          if (!newText) return;
          allEntries[outerIndex].text = newText;
          chrome.storage.local.set({ clipboard: allEntries }, () => {
            renderEntries(allEntries);
          });
        };

        updateBtn.addEventListener('click', saveChanges);

        // Cancel
        cancelBtn.addEventListener('click', () => renderEntries(allEntries));

        // Keyboard shortcuts
        textarea.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveChanges();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            renderEntries(allEntries);
          }
        });

        wrapper.appendChild(textarea);
        wrapper.appendChild(actions);
        textarea.focus();
      });

      // Remove button
      const removeBtn = document.createElement('span');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = 'x';
      removeBtn.title = 'Remove entry';

      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        allEntries.splice(outerIndex, 1);

        chrome.storage.local.set({ clipboard: allEntries }, () => {
          renderEntries(allEntries);
        });
      });

      wrapper.appendChild(textDiv);
      wrapper.appendChild(removeBtn);
      container.appendChild(wrapper);
    });
    updateTipVisibility();
  }
});
