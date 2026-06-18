const DEFAULT_SETTINGS = {
  retentionRule: 'all',
  theme: 'light',
};

const RETENTION_RULES = {
  all: { label: 'Keep all' },
  'days-7': { label: 'Keep 7 days', maxAgeDays: 7 },
  'days-30': { label: 'Keep 30 days', maxAgeDays: 30 },
  'days-90': { label: 'Keep 90 days', maxAgeDays: 90 },
};

const state = {
  entries: [],
  query: '',
  selectedDomain: 'all',
  sortBy: 'newest',
  retentionRule: DEFAULT_SETTINGS.retentionRule,
  bulkMode: false,
  selectedIds: new Set(),
  status: '',
  settingsOpen: false,
  theme: DEFAULT_SETTINGS.theme,
};

const refs = {};
let statusTimer = null;

function createEntryId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function entryTimestamp(entry) {
  if (!entry.copiedAt) return 0;
  const date = new Date(entry.copiedAt);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeEntry(entry, index) {
  return {
    id: entry.id || `${index}-${createEntryId()}`,
    text: entry.text || '',
    domain: entry.domain || 'unknown',
    sourceUrl: entry.sourceUrl || '',
    color: entry.color || '#f3f3f3',
    copiedAt: entry.copiedAt || null,
  };
}

function normalizeEntries(entries) {
  let changed = false;
  const normalized = entries.map((entry, index) => {
    const next = normalizeEntry(entry, index);
    if (
      next.id !== entry.id ||
      next.text !== entry.text ||
      next.domain !== entry.domain ||
      next.sourceUrl !== entry.sourceUrl ||
      next.color !== entry.color ||
      next.copiedAt !== entry.copiedAt
    ) {
      changed = true;
    }
    return next;
  });

  return { entries: normalized, changed };
}

function formatCapturedAt(copiedAt) {
  if (!copiedAt) return 'Imported entry';

  const date = new Date(copiedAt);
  if (Number.isNaN(date.getTime())) return 'Imported entry';

  return date.toLocaleString();
}

function buildPlainText(entries) {
  return entries
    .map((entry) => [
      `[${entry.domain}]`,
      entry.copiedAt ? `Captured: ${formatCapturedAt(entry.copiedAt)}` : null,
      entry.sourceUrl ? `URL: ${entry.sourceUrl}` : null,
      entry.text,
    ]
      .filter(Boolean)
      .join('\n'))
    .join('\n\n');
}

function getRetentionRule(ruleKey) {
  return RETENTION_RULES[ruleKey] || RETENTION_RULES.all;
}

function applyRetentionRule(entries, ruleKey) {
  const rule = getRetentionRule(ruleKey);
  let nextEntries = entries.slice();

  if (rule.maxAgeDays) {
    const cutoff = Date.now() - rule.maxAgeDays * 24 * 60 * 60 * 1000;
    nextEntries = nextEntries.filter((entry) => {
      const ts = entryTimestamp(entry);
      return !ts || ts >= cutoff;
    });
  }

  if (rule.keepCount) {
    nextEntries = sortEntries(nextEntries, 'newest').slice(0, rule.keepCount);
  }

  return nextEntries;
}

function matchesQuery(entry, query) {
  if (!query) return true;

  const haystack = [
    entry.text,
    entry.domain,
    entry.sourceUrl,
    entry.copiedAt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function sortEntries(entries, sortBy) {
  const decorated = entries.map((entry, index) => ({ entry, index }));

  decorated.sort((left, right) => {
    const a = left.entry;
    const b = right.entry;
    const aTime = entryTimestamp(a);
    const bTime = entryTimestamp(b);
    const domainCompare = a.domain.localeCompare(b.domain);
    const textCompare = a.text.localeCompare(b.text);

    switch (sortBy) {
      case 'oldest':
        if (aTime !== bTime) return aTime - bTime;
        if (domainCompare !== 0) return domainCompare;
        if (textCompare !== 0) return textCompare;
        return left.index - right.index;
      case 'domain-asc':
        if (domainCompare !== 0) return domainCompare;
        if (bTime !== aTime) return bTime - aTime;
        if (textCompare !== 0) return textCompare;
        return left.index - right.index;
      case 'domain-desc':
        if (domainCompare !== 0) return -domainCompare;
        if (bTime !== aTime) return bTime - aTime;
        if (textCompare !== 0) return textCompare;
        return left.index - right.index;
      case 'newest':
      default:
        if (aTime !== bTime) return bTime - aTime;
        if (domainCompare !== 0) return domainCompare;
        if (textCompare !== 0) return textCompare;
        return left.index - right.index;
    }
  });

  return decorated.map((item) => item.entry);
}

function filteredEntries() {
  return sortEntries(
    state.entries.filter((entry) => {
      const domainMatches =
        state.selectedDomain === 'all' || entry.domain === state.selectedDomain;
      return domainMatches && matchesQuery(entry, state.query);
    }),
    state.sortBy
  );
}

function selectedEntries() {
  return sortEntries(
    state.entries.filter((entry) => state.selectedIds.has(entry.id)),
    state.sortBy
  );
}

function updateSelectedIdsForEntries(nextEntries) {
  const validIds = new Set(nextEntries.map((entry) => entry.id));
  state.selectedIds = new Set(
    Array.from(state.selectedIds).filter((id) => validIds.has(id))
  );
}

function setStatus(message) {
  const statusNote = refs.statusNote;
  if (!statusNote) return;

  state.status = message;
  statusNote.textContent = message;
  statusNote.dataset.active = message ? 'true' : 'false';

  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }

  if (message) {
    statusTimer = setTimeout(() => {
      if (refs.statusNote) {
        refs.statusNote.textContent = '';
        refs.statusNote.dataset.active = 'false';
      }
      state.status = '';
    }, 2600);
  }
}

function saveSettings(nextSettings) {
  state.retentionRule = nextSettings.retentionRule || state.retentionRule || DEFAULT_SETTINGS.retentionRule;
  state.theme = nextSettings.theme || state.theme || DEFAULT_SETTINGS.theme;
  chrome.storage.local.set({
    clipboardSettings: {
      retentionRule: state.retentionRule,
      theme: state.theme,
    },
  });
  applyTheme();
}

function applyTheme() {
  document.body.dataset.theme = state.theme === 'dark' ? 'dark' : 'light';
}

function saveEntries(nextEntries, options) {
  const opts = options || {};
  const prunedEntries = applyRetentionRule(nextEntries, state.retentionRule);

  state.entries = prunedEntries;
  updateSelectedIdsForEntries(prunedEntries);

  chrome.storage.local.set({ clipboard: prunedEntries }, () => {
    if (!opts.silent) {
      render();
    }
  });
}

function removeEntry(entryId) {
  const nextEntries = state.entries.filter((entry) => entry.id !== entryId);
  saveEntries(nextEntries);
}

function updateEntry(entryId, nextText) {
  const trimmed = nextText.trim();
  if (!trimmed) return;

  const nextEntries = state.entries.map((entry) => (
    entry.id === entryId ? { ...entry, text: trimmed } : entry
  ));

  saveEntries(nextEntries);
}

function renderEmptyState(message) {
  const container = refs.container;
  container.className = 'clipboard-container clipboard-container-empty';
  container.textContent = message;
}

function createIconButton(label, variant, svgPath, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `entry-action entry-action-${variant}`;
  button.setAttribute('aria-label', label);
  button.title = label;

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', svgPath);
  icon.appendChild(path);

  button.appendChild(icon);
  button.addEventListener('click', onClick);
  return button;
}

function toggleSelection(entryId) {
  const next = new Set(state.selectedIds);
  if (next.has(entryId)) {
    next.delete(entryId);
  } else {
    next.add(entryId);
  }
  state.selectedIds = next;
  render();
}

function selectVisibleEntries() {
  const next = new Set(state.selectedIds);
  filteredEntries().forEach((entry) => next.add(entry.id));
  state.selectedIds = next;
  render();
}

function clearSelectionAndBulkMode() {
  state.bulkMode = false;
  state.selectedIds = new Set();
  render();
}

function copyEntriesToClipboard(entries, messagePrefix) {
  if (entries.length === 0) return;

  navigator.clipboard.writeText(buildPlainText(entries)).then(() => {
    setStatus(`${messagePrefix} ${entries.length} item${entries.length === 1 ? '' : 's'} copied.`);
  }).catch((error) => {
    console.error('Clipboard copy failed', error);
    setStatus('Copy failed. Check browser permissions.');
  });
}

function deleteSelectedEntries() {
  const entries = selectedEntries();
  if (entries.length === 0) return;

  const confirmed = confirm(`Delete ${entries.length} selected item${entries.length === 1 ? '' : 's'}?`);
  if (!confirmed) return;

  const selectedIdSet = new Set(state.selectedIds);
  const nextEntries = state.entries.filter((entry) => !selectedIdSet.has(entry.id));
  state.selectedIds = new Set();
  saveEntries(nextEntries);
  setStatus(`Deleted ${entries.length} selected item${entries.length === 1 ? '' : 's'}.`);
}

function cleanupNow() {
  const cleaned = applyRetentionRule(state.entries, state.retentionRule);
  const removed = state.entries.length - cleaned.length;
  saveEntries(cleaned);

  if (removed > 0) {
    setStatus(`Removed ${removed} old item${removed === 1 ? '' : 's'}.`);
  } else {
    setStatus('No cleanup needed.');
  }
}

function getDomainCounts(entries) {
  const counts = new Map();
  entries.forEach((entry) => {
    counts.set(entry.domain, (counts.get(entry.domain) || 0) + 1);
  });
  return counts;
}

function populateDomainFilter() {
  const filter = refs.domainFilter;
  if (!filter) return;

  const current = state.selectedDomain;
  const counts = getDomainCounts(state.entries);
  const domains = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));

  filter.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All domains';
  filter.appendChild(allOption);

  domains.forEach((domain) => {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = `${domain} (${counts.get(domain)})`;
    filter.appendChild(option);
  });

  if (current !== 'all' && counts.has(current)) {
    filter.value = current;
  } else {
    state.selectedDomain = 'all';
    filter.value = 'all';
  }
}

function syncControls() {
  if (refs.sortOrder) refs.sortOrder.value = state.sortBy;
  if (refs.retentionRule) refs.retentionRule.value = state.retentionRule;
  if (refs.themeMode) refs.themeMode.value = state.theme;
  if (refs.domainFilter && refs.domainFilter.value !== state.selectedDomain) {
    refs.domainFilter.value = state.selectedDomain;
  }
}

function updateBulkToolbar() {
  const toolbar = refs.bulkToolbar;
  const count = state.selectedIds.size;
  const active = state.bulkMode || count > 0;

  if (!toolbar) return;

  toolbar.hidden = !active;
  if (refs.selectionCount) {
    refs.selectionCount.textContent = `${count} selected`;
  }

  if (refs.toggleBulkMode) {
    const label = refs.toggleBulkMode.querySelector('span');
    if (label) label.textContent = state.bulkMode ? 'Exit bulk' : 'Bulk select';
    refs.toggleBulkMode.classList.toggle('is-active', state.bulkMode);
  }
}

function updateVisibility(hasEntries) {
  const display = hasEntries && !state.settingsOpen ? '' : 'none';
  if (refs.appHeader) refs.appHeader.style.display = display;
  if (refs.searchShell) refs.searchShell.style.display = display;
  if (refs.shortcutHint) refs.shortcutHint.style.display = display;
  if (refs.controlPanel) refs.controlPanel.style.display = display;
  if (refs.statusNote) refs.statusNote.style.display = display;
  if (refs.exportSection) refs.exportSection.style.display = display;
  if (refs.buttonBar) refs.buttonBar.style.display = display;
  if (refs.container) refs.container.style.display = state.settingsOpen ? 'none' : '';
  if (refs.bulkToolbar && (!hasEntries || state.settingsOpen)) refs.bulkToolbar.hidden = true;
  if (refs.settingsPanel) refs.settingsPanel.hidden = !state.settingsOpen;
}

function openSettings() {
  state.settingsOpen = true;
  render();
  if (refs.settingsPanel) {
    refs.settingsPanel.scrollTop = 0;
  }
}

function closeSettings() {
  state.settingsOpen = false;
  render();
}

function renderEntry(entry) {
  const wrapper = document.createElement('div');
  wrapper.className = 'clipboard-entry';
  wrapper.style.setProperty('--entry-accent', entry.color);
  wrapper.dataset.entryId = entry.id;
  wrapper.classList.toggle('is-selected', state.selectedIds.has(entry.id));

  const header = document.createElement('div');
  header.className = 'entry-header';

  const left = document.createElement('div');
  left.className = 'entry-left';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'entry-select';
  checkbox.checked = state.selectedIds.has(entry.id);
  checkbox.setAttribute('aria-label', `Select entry from ${entry.domain}`);
  checkbox.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  checkbox.addEventListener('change', () => toggleSelection(entry.id));

  const meta = document.createElement('div');
  meta.className = 'entry-meta';

  const domainRow = document.createElement('div');
  domainRow.className = 'entry-domain-row';

  const domainIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  domainIcon.setAttribute('viewBox', '0 0 24 24');
  domainIcon.setAttribute('class', 'entry-domain-icon');
  domainIcon.setAttribute('aria-hidden', 'true');
  const domainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  domainPath.setAttribute('d', 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm0-2c1.7 0 3.2-.5 4.5-1.4A15 15 0 0 0 12 15a15 15 0 0 0-4.5 2.6A7 7 0 0 0 12 19Zm0-16a7 7 0 0 0-4 12.8A17 17 0 0 1 12 13c1.5 0 3 .2 4 .6A7 7 0 0 0 12 3Zm5 10.3c.6-.9 1-2 1-3.3 0-.6-.1-1.2-.3-1.8A14.1 14.1 0 0 1 13.8 13c1.1.2 2.1.6 3.2 1.3ZM6.3 8.2c-.2.6-.3 1.2-.3 1.8 0 1.3.4 2.4 1 3.3A14.1 14.1 0 0 1 11 10a14.1 14.1 0 0 1-4.7-1.8Z');
  domainIcon.appendChild(domainPath);

  const domainSpan = document.createElement('span');
  domainSpan.className = 'entry-domain';
  domainSpan.textContent = entry.domain;
  domainRow.append(domainIcon, domainSpan);

  const timeRow = document.createElement('div');
  timeRow.className = 'entry-time-row';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'entry-time';
  timeSpan.textContent = formatCapturedAt(entry.copiedAt);
  timeRow.appendChild(timeSpan);

  meta.append(domainRow, timeRow);
  left.append(checkbox, meta);

  const actions = document.createElement('div');
  actions.className = 'entry-actions';

  const copyButton = createIconButton(
    'Copy entry',
    'copy',
    'M9 3h6l1 2h4v14H4V5h4l1-2Zm0 2-1 2h8l-1-2H9Zm-3 4v10h12V9H6Z',
    async (event) => {
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(entry.text);
        setStatus(`Copied entry from ${entry.domain}.`);
      } catch (error) {
        console.error('Clipboard copy failed', error);
        setStatus('Copy failed. Check browser permissions.');
      }
    }
  );

  const editButton = createIconButton(
    'Edit entry',
    'edit',
    'M4 17.2V20h2.8L17 9.8 14.2 7 4 17.2Zm13-8.4 1.4-1.4a1 1 0 0 0 0-1.4l-1.8-1.8a1 1 0 0 0-1.4 0L13.8 5.6 17 8.8Z',
    (event) => {
      event.stopPropagation();
      openEditor(wrapper, entry);
    }
  );

  const removeButton = createIconButton(
    'Delete entry',
    'delete',
    'M16 2v4h6v2h-2v14H4V8H2V6h6V2h8zm-2 2h-4v2h4V4zm0 4H6v12h12V8h-4zm-5 2h2v8H9v-8zm6 0h-2v8h2v-8z',
    (event) => {
      event.stopPropagation();
      removeEntry(entry.id);
      setStatus(`Deleted entry from ${entry.domain}.`);
    }
  );

  actions.append(copyButton, editButton, removeButton);

  const textDiv = document.createElement('div');
  textDiv.className = 'clipboard-text';
  textDiv.textContent = entry.text;
  textDiv.title = entry.sourceUrl || `From: ${entry.domain}`;

  textDiv.addEventListener('click', async () => {
    if (state.bulkMode) {
      toggleSelection(entry.id);
      return;
    }

    try {
      await navigator.clipboard.writeText(entry.text);
      setStatus(`Copied entry from ${entry.domain}.`);
    } catch (error) {
      console.error('Clipboard copy failed', error);
      setStatus('Copy failed. Check browser permissions.');
    }
  });

  textDiv.addEventListener('dblclick', () => {
    if (state.bulkMode) return;
    openEditor(wrapper, entry);
  });

  header.append(left, actions);
  wrapper.append(header, textDiv);
  return wrapper;
}

function openEditor(wrapper, entry) {
  wrapper.replaceChildren();
  wrapper.classList.add('editing');

  const textarea = document.createElement('textarea');
  textarea.value = entry.text;
  textarea.className = 'edit-box';

  const actions = document.createElement('div');
  actions.className = 'edit-actions';

  const updateBtn = document.createElement('button');
  updateBtn.textContent = 'Save';
  updateBtn.className = 'edit-btn update';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'edit-btn cancel';

  const saveChanges = () => updateEntry(entry.id, textarea.value);

  updateBtn.addEventListener('click', saveChanges);
  cancelBtn.addEventListener('click', render);
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      saveChanges();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      render();
    }
  });

  actions.append(updateBtn, cancelBtn);
  wrapper.append(textarea, actions);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function renderBulkToolbar() {
  if (!refs.bulkToolbar) return;

  updateBulkToolbar();
}

function render() {
  const container = refs.container;
  const visibleEntries = filteredEntries();

  container.innerHTML = '';
  container.className = 'clipboard-container';
  document.body.classList.toggle('bulk-mode', state.bulkMode);

  populateDomainFilter();
  syncControls();
  renderBulkToolbar();

  if (state.entries.length === 0) {
    renderEmptyState('Clipboard is empty. Copy text to begin.');
    updateVisibility(false);
    return;
  }

  if (visibleEntries.length === 0) {
    renderEmptyState('No matching entries found. Try a different domain or search term.');
    updateVisibility(true);
    return;
  }

  visibleEntries.forEach((entry) => {
    container.appendChild(renderEntry(entry));
  });

  updateVisibility(true);
}

function exportEntries() {
  if (state.entries.length === 0) return;

  const formatSelect = refs.downloadFormat;
  const format = formatSelect.value;
  const entriesToExport = state.selectedIds.size > 0 ? selectedEntries() : state.entries;

  if (format === 'txt') {
    const content = buildPlainText(entriesToExport);
    downloadFile(content, 'clipboard-history.txt', 'text/plain');
    setStatus(`Exported ${entriesToExport.length} item${entriesToExport.length === 1 ? '' : 's'} as TXT.`);
    return;
  }

  if (format === 'csv') {
    const header = ['Captured At', 'Domain', 'Source URL', 'Text'];
    const escapeCsv = (text) => `"${String(text == null ? '' : text).replace(/"/g, '""')}"`;
    const rows = entriesToExport.map((entry) => [
      escapeCsv(entry.copiedAt || ''),
      escapeCsv(entry.domain),
      escapeCsv(entry.sourceUrl || ''),
      escapeCsv(entry.text),
    ].join(','));

    const csvContent = [header.join(','), ...rows].join('\n');
    downloadFile(csvContent, 'clipboard-history.csv', 'text/csv');
    setStatus(`Exported ${entriesToExport.length} item${entriesToExport.length === 1 ? '' : 's'} as CSV.`);
  }
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: type || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function handleKeyboardShortcuts(event) {
  const target = event.target;
  const tagName = target && target.tagName ? target.tagName.toLowerCase() : '';

  if (event.key === 'Escape') {
    if (state.settingsOpen) {
      event.preventDefault();
      closeSettings();
      return;
    }

    if (state.bulkMode) {
      event.preventDefault();
      clearSelectionAndBulkMode();
      setStatus('');
      return;
    }

    if (refs.searchBox && refs.searchBox.value) {
      event.preventDefault();
      refs.searchBox.value = '';
      state.query = '';
      render();
    }
    return;
  }

  const isTypingField =
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select';

  if (event.key === '/' && !isTypingField && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    if (refs.searchBox) refs.searchBox.focus();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (refs.searchBox) refs.searchBox.focus();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'a') {
    event.preventDefault();
    state.bulkMode = !state.bulkMode;
    if (!state.bulkMode) {
      state.selectedIds = new Set();
    }
    render();
  }
}

function cleanupHistory() {
  const cleaned = applyRetentionRule(state.entries, state.retentionRule);
  const removed = state.entries.length - cleaned.length;

  if (removed > 0) {
    saveEntries(cleaned, { silent: true });
    setStatus(`Removed ${removed} old item${removed === 1 ? '' : 's'}.`);
    render();
    return;
  }

  setStatus('No cleanup needed.');
}

document.addEventListener('DOMContentLoaded', () => {
  refs.container = document.getElementById('clipboardContainer');
  refs.appHeader = document.querySelector('.app-header');
  refs.searchBox = document.getElementById('searchBox');
  refs.clearClipboard = document.getElementById('clearClipboard');
  refs.downloadFormat = document.getElementById('downloadFormat');
  refs.exportClipboard = document.getElementById('exportClipboard');
  refs.openSettings = document.getElementById('openSettings');
  refs.closeSettings = document.getElementById('closeSettings');
  refs.themeMode = document.getElementById('themeMode');
  refs.domainFilter = document.getElementById('domainFilter');
  refs.sortOrder = document.getElementById('sortOrder');
  refs.retentionRule = document.getElementById('retentionRule');
  refs.cleanupNow = document.getElementById('cleanupNow');
  refs.toggleBulkMode = document.getElementById('toggleBulkMode');
  refs.bulkToolbar = document.getElementById('bulkToolbar');
  refs.selectionCount = document.getElementById('selectionCount');
  refs.selectVisible = document.getElementById('selectVisible');
  refs.copySelected = document.getElementById('copySelected');
  refs.deleteSelected = document.getElementById('deleteSelected');
  refs.clearSelection = document.getElementById('clearSelection');
  refs.settingsPanel = document.getElementById('settingsPanel');
  refs.buttonBar = document.querySelector('.button-bar');
  refs.exportSection = document.querySelector('.export-section');
  refs.searchShell = document.querySelector('.search-shell');
  refs.shortcutHint = document.getElementById('shortcutHint');
  refs.controlPanel = document.querySelector('.control-panel');
  refs.statusNote = document.getElementById('statusNote');

  chrome.storage.local.get(
    {
      clipboard: [],
      clipboardSettings: DEFAULT_SETTINGS,
    },
    (result) => {
      const clipboard = Array.isArray(result.clipboard) ? result.clipboard : [];
      const normalized = normalizeEntries(clipboard);
      const settings = result.clipboardSettings || DEFAULT_SETTINGS;
      const retentionRule = RETENTION_RULES[settings.retentionRule]
        ? settings.retentionRule
        : DEFAULT_SETTINGS.retentionRule;
      const theme = settings.theme === 'dark' ? 'dark' : DEFAULT_SETTINGS.theme;

      state.entries = normalized.entries;
      state.retentionRule = retentionRule;
      state.theme = theme;

      if (normalized.changed) {
        chrome.storage.local.set({ clipboard: state.entries });
      }

      const cleaned = applyRetentionRule(state.entries, state.retentionRule);
      if (cleaned.length !== state.entries.length) {
        state.entries = cleaned;
        chrome.storage.local.set({ clipboard: cleaned });
      }

      applyTheme();
      render();
    }
  );

  refs.searchBox.addEventListener('input', () => {
    state.query = refs.searchBox.value.trim().toLowerCase();
    render();
  });

  refs.domainFilter.addEventListener('change', () => {
    state.selectedDomain = refs.domainFilter.value;
    render();
  });

  refs.sortOrder.addEventListener('change', () => {
    state.sortBy = refs.sortOrder.value;
    render();
  });

  refs.themeMode.addEventListener('change', () => {
    state.theme = refs.themeMode.value === 'dark' ? 'dark' : 'light';
    saveSettings({
      theme: state.theme,
      retentionRule: state.retentionRule,
    });
  });

  refs.retentionRule.addEventListener('change', () => {
    state.retentionRule = refs.retentionRule.value;
    saveSettings({
      theme: state.theme,
      retentionRule: state.retentionRule,
    });
    cleanupHistory();
  });

  refs.cleanupNow.addEventListener('click', cleanupHistory);
  if (refs.openSettings) {
    refs.openSettings.addEventListener('click', () => {
      if (state.settingsOpen) {
        closeSettings();
        return;
      }
      openSettings();
    });
  }
  if (refs.closeSettings) refs.closeSettings.addEventListener('click', closeSettings);

  refs.toggleBulkMode.addEventListener('click', () => {
    state.bulkMode = !state.bulkMode;
    if (!state.bulkMode) {
      state.selectedIds = new Set();
    }
    render();
  });

  refs.selectVisible.addEventListener('click', selectVisibleEntries);

  refs.copySelected.addEventListener('click', () => {
    const entries = selectedEntries();
    copyEntriesToClipboard(entries, 'Selected');
  });

  refs.deleteSelected.addEventListener('click', deleteSelectedEntries);

  refs.clearSelection.addEventListener('click', clearSelectionAndBulkMode);

  refs.clearClipboard.addEventListener('click', () => {
    if (!confirm('This will delete all clipboard entries. Are you sure?')) return;

    state.selectedIds = new Set();
    saveEntries([]);
    refs.searchBox.value = '';
    state.query = '';
    state.selectedDomain = 'all';
    state.sortBy = 'newest';
    state.bulkMode = false;
    setStatus('Clipboard history cleared.');
  });

  refs.exportClipboard.addEventListener('click', exportEntries);

  document.addEventListener('keydown', handleKeyboardShortcuts);

  updateBulkToolbar();
  updateVisibility(true);
});
