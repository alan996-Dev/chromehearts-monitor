document.addEventListener('DOMContentLoaded', () => {
  let dbData = {
    last_checked: null,
    last_changed: null,
    menu_items: [],
    products: []
  };
  
  let activeFilter = 'all';

  // Elements
  const statLastChecked = document.getElementById('stat-last-checked');
  const statTotalProducts = document.getElementById('stat-total-products');
  const statTotalMenu = document.getElementById('stat-total-menu');
  const categoryTabs = document.getElementById('category-tabs');
  const productsGrid = document.getElementById('products-grid');
  const displayTitle = document.getElementById('display-title');
  const displayCount = document.getElementById('display-count');
  const repoLink = document.getElementById('repo-link');

  // Auto-detect GitHub repository url
  function detectRepoUrl() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('github.io')) {
      const user = hostname.split('.')[0];
      const repo = pathname.split('/')[1] || '';
      if (user && repo) {
        repoLink.href = `https://github.com/${user}/${repo}`;
        return;
      }
    }
    // Fallback if hosted locally
    repoLink.href = '#';
    repoLink.style.cursor = 'default';
    repoLink.addEventListener('click', (e) => e.preventDefault());
  }

  // Helper to format relative time
  function getRelativeTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'JUST NOW';
    if (diffMins < 60) return `${diffMins} MINS AGO`;
    if (diffHours < 24) return `${diffHours} HOURS AGO`;
    if (diffDays === 1) return 'YESTERDAY';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
  }

  // Format date nicely
  function formatDateTime(isoString) {
    if (!isoString) return 'NEVER';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).toUpperCase();
  }

  // Load database JSON
  async function loadDatabase() {
    try {
      // In docs/index.html, data/products.json is relative to the root/docs page
      const response = await fetch('./data/products.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load data file (${response.status})`);
      }
      const data = await response.json();
      dbData = data;
      updateDashboard();
    } catch (err) {
      console.error('Error loading database:', err);
      productsGrid.innerHTML = `
        <div class="empty-state">
          <p style="color: #ff3333;">Failed to load database.</p>
          <p style="font-size: 0.8rem; margin-top: 5px;">Ensure the database file exists at docs/data/products.json.</p>
        </div>
      `;
    }
  }

  // Update stats and trigger item renders
  function updateDashboard() {
    // Stats update
    statLastChecked.textContent = formatDateTime(dbData.last_checked);
    statTotalProducts.textContent = dbData.products ? dbData.products.length : 0;
    statTotalMenu.textContent = dbData.menu_items ? dbData.menu_items.length : 0;

    renderFeed();
  }

  // Render items based on active tab
  function renderFeed() {
    productsGrid.innerHTML = '';
    
    // Sort products by date seen descending (newest first)
    const sortedProducts = dbData.products ? [...dbData.products].sort((a, b) => {
      return new Date(b.first_seen || 0) - new Date(a.first_seen || 0);
    }) : [];

    // Filter logic
    if (activeFilter === 'menu_changes') {
      displayTitle.textContent = 'MENU CATEGORIES';
      const menuItems = dbData.menu_items || [];
      displayCount.textContent = `${menuItems.length} Categories`;

      if (menuItems.length === 0) {
        productsGrid.innerHTML = `
          <div class="empty-state">
            <p>No navigation menu categories recorded yet.</p>
          </div>
        `;
        return;
      }

      menuItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-change-card glass';
        card.innerHTML = `
          <h3 class="menu-change-name">${item.name}</h3>
          <p class="menu-change-url">${item.url}</p>
          <a class="menu-change-btn" href="${item.url}" target="_blank" rel="noopener noreferrer">Visit Category</a>
        `;
        productsGrid.appendChild(card);
      });
      
    } else {
      // Standard Product filtering
      let filtered = sortedProducts;
      if (activeFilter !== 'all') {
        filtered = sortedProducts.filter(p => {
          const category = p.category ? p.category.toUpperCase() : '';
          return category === activeFilter.toUpperCase();
        });
      }

      displayTitle.textContent = `${activeFilter.replace('-', ' ')} Feed`;
      displayCount.textContent = `${filtered.length} Items`;

      if (filtered.length === 0) {
        productsGrid.innerHTML = `
          <div class="empty-state">
            <p>No new arrivals detected in this category yet.</p>
          </div>
        `;
        return;
      }

      filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card glass';
        
        // Calculate relative time since first seen
        const timeBadge = p.first_seen ? `<span class="first-seen-tag">${getRelativeTime(p.first_seen)}</span>` : '';
        const catBadge = p.category ? `<span class="category-tag">${p.category}</span>` : '';

        card.innerHTML = `
          <div class="product-img-wrapper">
            ${catBadge}
            ${timeBadge}
            <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://www.chromehearts.com/on/demandware.static/Sites-ChromeHearts-Site/-/default/dw0eee263d/images/y-all-are-welcome@2x.png'" />
          </div>
          <div class="product-details">
            <h3 class="product-name" title="${p.name}">${p.name}</h3>
            <div class="product-meta-row">
              <span class="product-pid">${p.id}</span>
              <span class="product-price">${p.price}</span>
            </div>
            <a class="product-link-btn" href="${p.url}" target="_blank" rel="noopener noreferrer">View Product</a>
          </div>
        `;
        productsGrid.appendChild(card);
      });
    }
  }

  // Tabs setup
  categoryTabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn')) {
      // Remove active from all tabs
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      
      // Make clicked active
      e.target.classList.add('active');
      activeFilter = e.target.getAttribute('data-category');
      
      renderFeed();
    }
  });

  // Run on start
  detectRepoUrl();
  loadDatabase();
});
