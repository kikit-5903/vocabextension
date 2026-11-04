document.addEventListener('DOMContentLoaded', () => {
  const trackingToggle = document.getElementById('trackingToggle');
  const catSelect = document.getElementById('categorySelect');
  const deleteCatBtn = document.getElementById('deleteCategoryBtn');
  const openDash = document.getElementById('openDashboard');
  const wordsContainer = document.getElementById('wordsListContainer');

  chrome.storage.local.get({
    trackingEnabled: true,
    activeCategory: 'Educated',
    categories: ['General', 'Educated', 'Novel'],
    savedWords: []
  }, (data) => {
    trackingToggle.checked = data.trackingEnabled;

    catSelect.innerHTML = '';
    data.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === data.activeCategory) opt.selected = true;
      catSelect.appendChild(opt);
    });

    renderWords(data.savedWords);
  });

  trackingToggle.addEventListener('change', () => {
    chrome.storage.local.set({ trackingEnabled: trackingToggle.checked });
  });

  catSelect.addEventListener('change', () => {
    chrome.storage.local.set({ activeCategory: catSelect.value });
  });

  deleteCatBtn.addEventListener('click', () => {
    const catToDelete = catSelect.value;
    if (confirm(`Delete category "${catToDelete}"?`)) {
      chrome.storage.local.get({ categories: [], savedWords: [] }, (data) => {
        const newCats = data.categories.filter(c => c !== catToDelete);
        const finalCats = newCats.length > 0 ? newCats : ['General'];
        const newWords = data.savedWords.filter(w => w.category !== catToDelete);
        
        chrome.storage.local.set({
          categories: finalCats,
          activeCategory: finalCats[0],
          savedWords: newWords
        }, () => {
          window.location.reload();
        });
      });
    }
  });

  openDash.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  function renderWords(words) {
    wordsContainer.innerHTML = '';
    if (!words || words.length === 0) {
      wordsContainer.innerHTML = '<div class="empty-state">No saved words yet. Search on Google & highlight a definition!</div>';
      return;
    }

    const sorted = [...words].reverse();
    sorted.forEach(item => {
      const card = document.createElement('div');
      card.className = 'word-card';
      card.innerHTML = `
        <div class="word-header">
          <span class="word-title">${escapeHtml(item.word)} <span class="word-cat">[${escapeHtml(item.category || 'General')}]</span></span>
          <button class="btn-icon delete-word-btn" data-id="${item.id}" title="Delete">×</button>
        </div>
        <div class="word-def">${escapeHtml(item.definition)}</div>
      `;
      wordsContainer.appendChild(card);
    });

    document.querySelectorAll('.delete-word-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        chrome.storage.local.get({ savedWords: [] }, (data) => {
          const updated = data.savedWords.filter(w => w.id !== id);
          chrome.storage.local.set({ savedWords: updated }, () => {
            renderWords(updated);
          });
        });
      });
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
});