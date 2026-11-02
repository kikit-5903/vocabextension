document.addEventListener('DOMContentLoaded', () => {
  const toggleTracking = document.getElementById('toggleTracking');
  const categorySelect = document.getElementById('categorySelect');
  const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');
  const newCategoryRow = document.getElementById('newCategoryRow');
  const newCategoryInput = document.getElementById('newCategoryInput');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const openDashboardBtn = document.getElementById('openDashboard');
  const wordListContainer = document.getElementById('wordListContainer');

  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  chrome.storage.local.get({ isEnabled: true, activeCategory: 'General', categories: ['General', 'Educated', 'Novel'], savedWords: [] }, (data) => {
    toggleTracking.checked = data.isEnabled;
    updateCategoryDropdown(data.categories, data.activeCategory);
    renderWords(data.savedWords);
  });

  toggleTracking.addEventListener('change', () => {
    chrome.storage.local.set({ isEnabled: toggleTracking.checked });
  });

  categorySelect.addEventListener('change', () => {
    if (categorySelect.value === 'Custom') {
      newCategoryRow.style.display = 'flex';
      newCategoryInput.focus();
      deleteCategoryBtn.style.display = 'none';
    } else {
      newCategoryRow.style.display = 'none';
      chrome.storage.local.set({ activeCategory: categorySelect.value });
      deleteCategoryBtn.style.display = categorySelect.value === 'General' ? 'block' : 'block';
      if (categorySelect.value === 'General') deleteCategoryBtn.style.display = 'none';
    }
  });

  deleteCategoryBtn.addEventListener('click', () => {
    const catToDelete = categorySelect.value;
    if (catToDelete === 'General') return;

    chrome.storage.local.get({ categories: ['General', 'Educated', 'Novel'], savedWords: [] }, (data) => {
      let cats = data.categories.filter(c => c !== catToDelete);
      let words = data.savedWords.map(w => w.category === catToDelete ? { ...w, category: 'General' } : w);

      chrome.storage.local.set({ categories: cats, activeCategory: 'General', savedWords: words }, () => {
        updateCategoryDropdown(cats, 'General');
        newCategoryRow.style.display = 'none';
        renderWords(words);
      });
    });
  });

  addCategoryBtn.addEventListener('click', () => {
    const newCat = newCategoryInput.value.trim();
    if (!newCat) return;

    chrome.storage.local.get({ categories: ['General', 'Educated', 'Novel'], savedWords: [] }, (data) => {
      let cats = data.categories;
      if (!cats.includes(newCat)) cats.push(newCat);
      chrome.storage.local.set({ categories: cats, activeCategory: newCat }, () => {
        updateCategoryDropdown(cats, newCat);
        newCategoryRow.style.display = 'none';
        newCategoryInput.value = '';
        renderWords(data.savedWords);
      });
    });
  });

  function updateCategoryDropdown(categories, activeCat) {
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      if (cat === activeCat) option.selected = true;
      categorySelect.appendChild(option);
    });
    const customOption = document.createElement('option');
    customOption.value = 'Custom';
    customOption.textContent = '+ New Category';
    categorySelect.appendChild(customOption);

    deleteCategoryBtn.style.display = (activeCat === 'General' || activeCat === 'Custom') ? 'none' : 'block';
  }

  function renderWords(words) {
    wordListContainer.innerHTML = '';
    if (words.length === 0) {
      wordListContainer.innerHTML = '<div class="empty-text">No saved words yet.</div>';
      return;
    }

    words.slice().reverse().forEach(item => {
      const div = document.createElement('div');
      div.className = 'vocab-item';
      div.innerHTML = `
        <div class="vocab-top">
          <span class="vocab-word">${item.word} <span style="font-size:9px; color:#777; font-weight:normal;">[${item.category || 'General'}]</span></span>
          <button class="delete-btn" data-id="${item.id}" title="Delete">✕</button>
        </div>
        <div class="vocab-def">${item.definition}</div>
      `;
      wordListContainer.appendChild(div);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        chrome.storage.local.get({ savedWords: [] }, (data) => {
          const updated = data.savedWords.filter(w => String(w.id) !== String(id));
          chrome.storage.local.set({ savedWords: updated }, () => renderWords(updated));
        });
      });
    });
  }
});