document.addEventListener('DOMContentLoaded', () => {
  const dashboardContent = document.getElementById('dashboardContent');
  const totalCount = document.getElementById('totalCount');
  const categoryFilter = document.getElementById('categoryFilter');
  const searchInput = document.getElementById('searchInput');

  let allWords = [];
  let allCategories = [];

  function loadDashboard() {
    chrome.storage.local.get({ savedWords: [], categories: ['General', 'Educated', 'Novel'] }, (data) => {
      allWords = data.savedWords;
      allCategories = data.categories;

      updateCategoryFilterDropdown();
      renderFilteredData();
    });
  }

  function updateCategoryFilterDropdown() {
    const currentSelected = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="ALL">All Categories</option>';
    allCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === currentSelected) opt.selected = true;
      categoryFilter.appendChild(opt);
    });
  }

  function renderFilteredData() {
    const selectedCategory = categoryFilter.value;
    const searchTerm = searchInput.value.toLowerCase().trim();

    let filtered = allWords.filter(item => {
      const matchesCategory = (selectedCategory === 'ALL') || ((item.category || 'General') === selectedCategory);
      const matchesSearch = !searchTerm || 
        item.word.toLowerCase().includes(searchTerm) || 
        item.definition.toLowerCase().includes(searchTerm);
      return matchesCategory && matchesSearch;
    });

    totalCount.textContent = `TOTAL ITEMS: ${filtered.length}`;

    if (filtered.length === 0) {
      dashboardContent.innerHTML = `
        <div class="empty-state">
          <h3>No vocabulary found.</h3>
          <p>Try adjusting your search query or category filter.</p>
        </div>
      `;
      return;
    }

    const grouped = {};
    filtered.forEach(item => {
      const cat = item.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    dashboardContent.innerHTML = '';

    for (const [category, items] of Object.entries(grouped)) {
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const section = document.createElement('div');
      section.className = 'category-section';
      section.setAttribute('data-category', category);

      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = `
        <span>${category} (${items.length})</span>
        <div class="category-actions">
          <button class="export-btn" data-category="${category}">Export PDF</button>
        </div>
      `;
      section.appendChild(header);

      const table = document.createElement('table');
      table.className = 'vocab-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th class="vocab-col">Term</th>
            <th class="def-col">Definition</th>
            <th class="action-col"></th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector('tbody');

      items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="vocab-col">${item.word}</td>
          <td class="def-col">${item.definition}</td>
          <td class="action-col">
            <button class="delete-btn" data-id="${item.id}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      section.appendChild(table);
      dashboardContent.appendChild(section);
    }

    // Attach delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.delete-btn');
        if (!targetBtn) return;
        const idToDelete = targetBtn.getAttribute('data-id');
        chrome.storage.local.get({ savedWords: [] }, (d) => {
          const updatedWords = d.savedWords.filter(w => String(w.id) !== String(idToDelete));
          chrome.storage.local.set({ savedWords: updatedWords }, () => {
            loadDashboard();
          });
        });
      });
    });

    // Attach export PDF listeners
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const catToExport = e.target.getAttribute('data-category');
        exportCategoryAsPDF(catToExport);
      });
    });
  }

  function exportCategoryAsPDF(categoryName) {
    const sections = document.querySelectorAll('.category-section');
    sections.forEach(sec => {
      if (sec.getAttribute('data-category') !== categoryName) {
        sec.classList.add('hidden-for-print');
      } else {
        sec.classList.remove('hidden-for-print');
      }
    });

    window.print();

    setTimeout(() => {
      sections.forEach(sec => sec.classList.remove('hidden-for-print'));
    }, 500);
  }

  categoryFilter.addEventListener('change', renderFilteredData);
  searchInput.addEventListener('input', renderFilteredData);

  loadDashboard();
});