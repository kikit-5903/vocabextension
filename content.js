let popupEl = null;

document.addEventListener('mouseup', (e) => {
  // IGNORE if the highlight/click is inside a search bar, input, or textarea!
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) {
    return;
  }

  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) {
      if (popupEl && !popupEl.contains(e.target)) {
        popupEl.remove();
        popupEl = null;
      }
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (popupEl) popupEl.remove();

    chrome.storage.local.get({ trackingEnabled: true, pendingGoogleWord: 'verge', activeCategory: 'Educated', savedWords: [] }, (data) => {
      if (!data.trackingEnabled) return;

      const pendingWord = data.pendingGoogleWord || "Word";

      popupEl = document.createElement('div');
      popupEl.id = 'vocablist-float-popup';
      
      Object.assign(popupEl.style, {
        position: 'absolute',
        top: `${window.scrollY + rect.bottom + 8}px`,
        left: `${window.scrollX + rect.left}px`,
        zIndex: '999999',
        background: '#f7f4ed',
        color: '#1a1a1a',
        border: '3px solid #1a1a1a',
        boxShadow: '4px 4px 0px #1a1a1a',
        padding: '14px',
        fontFamily: 'monospace, sans-serif',
        fontSize: '12px',
        borderRadius: '6px',
        width: '280px',
        boxSizing: 'border-box'
      });

      popupEl.innerHTML = `
        <div style="font-weight: 900; margin-bottom: 6px; font-size: 11px; text-transform: uppercase;">VocabList Capture</div>
        <div style="font-size: 12px; font-weight: 800; color: #1a1a1a; margin-bottom: 4px;">Word: <span style="color: #ff5722;">${pendingWord}</span></div>
        <div style="font-size: 11px; color: #444; margin-bottom: 10px; max-height: 55px; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;" title="${selectedText}">Def: "${selectedText}"</div>
        <button id="vocab-save-google-btn" style="width: 100%; background: #ff5722; color: #fff; border: 2px solid #1a1a1a; padding: 8px; font-family: monospace; font-weight: 800; cursor: pointer; border-radius: 4px; box-shadow: 2px 2px 0px #1a1a1a;">Save to VocabList</button>
      `;

      document.body.appendChild(popupEl);

      const saveBtn = document.getElementById('vocab-save-google-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const category = data.activeCategory || 'Educated';
          let words = data.savedWords;

          const existing = words.find(w => w.word.toLowerCase() === pendingWord.toLowerCase());
          if (existing) {
            alert(`"${pendingWord}" is already in your VocabList (${category})!`);
            popupEl.remove();
            popupEl = null;
            return;
          }

          const now = Date.now();
          words.push({
            id: 'id_' + now,
            word: pendingWord,
            definition: selectedText,
            category: category,
            createdAt: now
          });

          chrome.storage.local.set({ savedWords: words, pendingGoogleWord: null }, () => {
            popupEl.innerHTML = `<div style="font-weight: 900; color: #2e7d32; text-align: center; padding: 8px;">Saved "${pendingWord}"!</div>`;
            setTimeout(() => {
              if (popupEl) {
                popupEl.remove();
                popupEl = null;
              }
            }, 1400);
          });
        });
      }
    });
  }, 50);
});

document.addEventListener('mousedown', (e) => {
  if (popupEl && !popupEl.contains(e.target)) {
    popupEl.remove();
    popupEl = null;
  }
});