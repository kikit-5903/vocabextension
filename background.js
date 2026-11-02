chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveToVocabList",
    title: "Save '%s' to VocabList",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveToVocabList" && info.selectionText) {
    const cleanWord = info.selectionText.trim();
    if (!cleanWord) return;
    processWordAction(cleanWord, tab?.id, tab?.url);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const targetUrl = tab.url;
  if (!targetUrl) return;

  try {
    const url = new URL(targetUrl);
    if (url.hostname.includes('google.') || url.hostname.includes('bing.com')) {
      const query = url.searchParams.get('q');
      if (!query) return;

      const cleanQuery = query.replace(/\b(meaning|definition|define|of)\b/gi, '').trim();
      if (!cleanQuery) return;

      processWordAction(cleanQuery, tabId, targetUrl);
    }
  } catch (e) {
    console.error(e);
  }
});

async function processWordAction(searchWord, tabId, currentUrl) {
  chrome.storage.local.get({ isEnabled: true, activeCategory: 'General', savedWords: [] }, async (data) => {
    if (!data.isEnabled) return;

    const category = data.activeCategory || 'General';
    let words = data.savedWords;

    // Check if this word already exists anywhere in your saved vocabulary list (case-insensitive)
    const existingWord = words.find(
      w => w.word.toLowerCase() === searchWord.toLowerCase()
    );

    if (existingWord) {
      // WORD ALREADY EXISTS -> Show on-screen retro reminder banner
      if (tabId) {
        showOnScreenReminder(tabId, `VocabList: "${searchWord}" is already in your list (${existingWord.category || 'General'})!`);
      }
      return;
    }

    // Only auto-save if they searched with "meaning", "definition", or "define"
    const isExplicitLookup = /\b(meaning|definition|define)\b/i.test(currentUrl || '');
    if (!isExplicitLookup) return;

    let definition = "Definition not available.";
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchWord)}`);
      const apiData = await response.json();
      if (Array.isArray(apiData) && apiData[0]?.meanings?.[0]?.definitions?.[0]?.definition) {
        definition = apiData[0].meanings[0].definitions[0].definition;
      } else {
        return;
      }
    } catch (err) {
      return;
    }

    const now = Date.now();
    words.push({
      id: 'id_' + now,
      word: searchWord,
      definition: definition,
      category: category,
      createdAt: now
    });

    chrome.storage.local.set({ savedWords: words }, () => {
      if (tabId) {
        showOnScreenReminder(tabId, `VocabList: Saved "${searchWord}" to ${category}!`);
      }
    });
  });
}

function showOnScreenReminder(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    args: [message],
    func: (msg) => {
      const existing = document.getElementById('vocablist-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'vocablist-toast';
      toast.textContent = msg;
      Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '999999',
        background: '#f7f4ed',
        color: '#1a1a1a',
        border: '3px solid #1a1a1a',
        boxShadow: '4px 4px 0px #1a1a1a',
        padding: '14px 20px',
        fontFamily: 'monospace, sans-serif',
        fontSize: '13px',
        fontWeight: '800',
        borderRadius: '6px',
        transition: 'opacity 0.4s ease'
      });
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
      }, 5000);
    }
  }).catch(err => console.log("Toast error:", err));
}