/**
 * Initializes the extension when it is first installed or updated.
 * Sets up the 'clipboard' key in Chrome local storage as an empty array.
 *
 * @sideEffects Creates/overwrites the 'clipboard' entry in Chrome local storage.
*/
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ clipboard: [] });
});
