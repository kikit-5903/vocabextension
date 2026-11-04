chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const targetUrl = tab.url;
  if (!targetUrl) return;

  chrome.storage.local.get({ trackingEnabled: true }, (settings) => {
    if (!settings.trackingEnabled) return;

    try {
      const url = new URL(targetUrl);
      if (url.hostname.includes('google.') && url.pathname.includes('/search')) {
        const query = url.searchParams.get('q');
        if (!query) return;

        // Automatically strip fluff words like meaning, definition, define, etc.
        const cleanWord = query.replace(/\b(meaning|definition|define|of|what is)\b/gi, '').trim();
        if (!cleanWord) return;

        chrome.storage.local.set({ pendingGoogleWord: cleanWord }, () => {
          console.log("VocabList: Captured search word ->", cleanWord);
        });
      }
    } catch (e) {
      console.error(e);
    }
  });
});