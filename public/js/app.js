// ==========================================================================
// FEASTIFY - CORE APPLICATION CONTROLLER
// High-performance State Management, Restaurant Filtering, and Routing
// ==========================================================================

class FeastifyApp {
  constructor() {
    this.currentCity = 'Bengaluru';
    this.activeServiceTab = 'delivery';
    this.selectedCategory = null;
    this.isPureVeg = false;
    this.minRating = null;
    this.sortBy = null;
    this.searchQuery = '';
    this.searchDebounceTimer = null;

    this.restaurantsList = [];
    this.currentRestaurant = null;

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadCategories();
    await this.loadRestaurants();
    cartManager.updateCartBadge();
  }

  setupEventListeners() {
    // Esc key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        document.getElementById('cartDrawerOverlay').classList.add('hidden');
      }
    });
  }

  // --------------------------------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------------------------------
  async loadCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (!data.success) return;

      const carousel = document.getElementById('categoryCarousel');
      if (!carousel) return;

      carousel.innerHTML = data.data.map(cat => `
        <div class="category-card ${this.selectedCategory === cat.name ? 'active-cat' : ''}" onclick="app.selectCategory('${cat.name}')">
          <div class="cat-img-box">
            <img src="${cat.image}" alt="${cat.name}" loading="lazy">
          </div>
          <span class="cat-title">${cat.name}</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  selectCategory(categoryName) {
    if (this.selectedCategory === categoryName) {
      this.selectedCategory = null;
    } else {
      this.selectedCategory = categoryName;
    }
    this.loadCategories(); // refresh active state
    this.loadRestaurants();
    this.showToast(this.selectedCategory ? `Showing ${this.selectedCategory} places` : `Cleared category filter`, 'info');
  }

  // --------------------------------------------------------------------------
  // RESTAURANTS
  // --------------------------------------------------------------------------
  async loadRestaurants() {
    const grid = document.getElementById('restaurantsGrid');
    const notice = document.getElementById('restaurantCountNotice');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color: #e23744; margin-bottom: 1rem;"></i>
          <p style="color:#6b7280; font-weight:600;">Finding delectable restaurants in ${this.currentCity}...</p>
        </div>
      `;
    }

    try {
      const params = new URLSearchParams();
      params.append('city', this.currentCity);
      if (this.isPureVeg) params.append('isPureVeg', 'true');
      if (this.minRating) params.append('minRating', this.minRating);
      if (this.sortBy) params.append('sortBy', this.sortBy);
      if (this.selectedCategory) params.append('category', this.selectedCategory);
      if (this.searchQuery) params.append('search', this.searchQuery);

      const res = await fetch(`/api/restaurants?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        grid.innerHTML = `<p>Error loading restaurants</p>`;
        return;
      }

      this.restaurantsList = data.data;

      if (notice) {
        notice.innerText = `${this.restaurantsList.length} places to explore`;
      }

      this.renderRestaurantsGrid();
    } catch (err) {
      console.error('Failed to load restaurants:', err);
      if (grid) grid.innerHTML = `<p style="text-align:center; padding:2rem; color:red;">Failed to connect to Feastify server.</p>`;
    }
  }

  renderRestaurantsGrid() {
    const grid = document.getElementById('restaurantsGrid');
    if (!grid) return;

    if (this.restaurantsList.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; background:white; border-radius:12px;">
          <i class="fa-solid fa-plate-wheat" style="font-size:3rem; color:#d1d5db; margin-bottom:1rem;"></i>
          <h3>No matching restaurants found</h3>
          <p style="color:#6b7280; margin:0.5rem 0 1.5rem;">Try relaxing your filters or searching for another dish.</p>
          <button class="primary-btn" onclick="app.resetAllFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.restaurantsList.map(r => `
      <div class="restaurant-card" onclick="app.openRestaurant('${r.id}')">
        <div class="card-media-box">
          <img src="${r.image}" alt="${r.name}" loading="lazy">
          ${r.offer ? `<span class="offer-ribbon">${r.offer}</span>` : ''}
          <span class="time-badge"><i class="fa-solid fa-clock"></i> ${r.deliveryTime} mins</span>
        </div>

        <div class="card-info">
          <div class="card-title-row">
            <h3 title="${r.name}">${r.name}</h3>
            <span class="rating-badge">${r.rating} ★</span>
          </div>

          <div class="cuisines-row">
            <span class="cuisines-text">${r.cuisines.join(', ')}</span>
            <span class="cost-text">₹${r.costForTwo} for two</span>
          </div>

          <div class="card-footer-area">
            <span class="location-sub"><i class="fa-solid fa-map-pin" style="color:#9ca3af; margin-right:4px;"></i>${r.area}</span>
            <span class="max-safety-pill"><i class="fa-solid fa-shield-virus"></i> Follows Safety</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // RESTAURANT DETAILS VIEW
  // --------------------------------------------------------------------------
  async openRestaurant(restaurantId) {
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}`);
      const result = await res.json();
      if (!result.success) return;

      this.currentRestaurant = result.data;
      this.renderRestaurantDetail(this.currentRestaurant);

      // Switch views
      document.getElementById('homeView').classList.add('hidden');
      document.getElementById('orderTrackingView').classList.add('hidden');
      document.getElementById('restaurantDetailView').classList.remove('hidden');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error fetching restaurant details:', err);
    }
  }

  renderRestaurantDetail(restaurant) {
    // Breadcrumb
    const bc = document.getElementById('detailBreadcrumb');
    if (bc) bc.innerText = `Home / ${restaurant.city} / ${restaurant.area} / ${restaurant.name}`;

    // Header banner
    const banner = document.getElementById('restHeaderBanner');
    if (banner) {
      banner.innerHTML = `
        <img src="${restaurant.image}" class="rest-cover-image" alt="${restaurant.name}">
        <div class="rest-header-details">
          <div class="rest-main-info">
            <h1>${restaurant.name}</h1>
            <div class="rest-cuisines">${restaurant.cuisines.join(', ')}</div>
            <div class="rest-location"><i class="fa-solid fa-location-dot" style="color:var(--primary); margin-right:4px;"></i> ${restaurant.area}, ${restaurant.city}</div>
            <div class="rest-meta-pills">
              <span class="meta-pill"><i class="fa-solid fa-clock"></i> ${restaurant.deliveryTime} mins delivery</span>
              <span class="meta-pill">₹${restaurant.costForTwo} for two</span>
              ${restaurant.isPureVeg ? '<span class="meta-pill" style="color:#15803d; background:#dcfce7;">Pure Veg Kitchen</span>' : ''}
              ${restaurant.offer ? `<span class="meta-pill" style="color:#1d4ed8; background:#dbeafe;">${restaurant.offer}</span>` : ''}
            </div>
          </div>
          <div class="rest-ratings-box">
            <div class="rating-score-card">
              <div class="rating-number-wrap">${restaurant.rating} ★</div>
              <div class="rating-count-text">${restaurant.reviewCount || 1200}+ Dining & Delivery Ratings</div>
            </div>
          </div>
        </div>
      `;
    }

    // Sidebar & Menus
    this.renderMenu(restaurant);

    // Overview details
    const ov = document.getElementById('overviewDetails');
    if (ov) {
      ov.innerHTML = `
        <p style="margin-bottom:0.75rem; color:#4b5563;">Popular dining destination known for exceptional culinary quality, fresh ingredients, and lightning-fast packaging.</p>
        <div style="font-size:0.9rem; color:#374151; display:flex; flex-direction:column; gap:0.5rem;">
          <div><strong>Cuisines:</strong> ${restaurant.cuisines.join(', ')}</div>
          <div><strong>Average Cost:</strong> ₹${restaurant.costForTwo} for two people (approx.)</div>
          <div><strong>Payment Accepted:</strong> Cash, UPI, Credit Cards, Net Banking</div>
        </div>
      `;
    }

    const addr = document.getElementById('restaurantAddressText');
    if (addr) addr.innerText = `${restaurant.name}, 1st Floor, Main Boulevard, ${restaurant.area}, ${restaurant.city}`;

    // Initialize mini map in Overview tab
    mapManager.initMiniRestaurantMap(restaurant.lat, restaurant.lng, restaurant.name);

    // Render sample reviews
    this.renderReviews(restaurant);
  }

  renderMenu(restaurant) {
    const sidebar = document.getElementById('menuSidebar');
    const itemsArea = document.getElementById('menuItemsArea');
    if (!sidebar || !itemsArea) return;

    const categories = Object.keys(restaurant.categorizedMenu || {});

    sidebar.innerHTML = categories.map((cat, idx) => `
      <div class="menu-sidebar-item ${idx === 0 ? 'active' : ''}" onclick="app.scrollToMenuCat('${cat}', this)">
        ${cat} (${restaurant.categorizedMenu[cat].length})
      </div>
    `).join('');

    itemsArea.innerHTML = categories.map(cat => `
      <div class="menu-category-section" id="cat_section_${cat.replace(/\s+/g, '_')}">
        <h3>${cat}</h3>
        <div class="menu-items-grid">
          ${restaurant.categorizedMenu[cat].map(dish => {
            const qty = cartManager.getItemQuantity(dish.id);
            return `
              <div class="menu-item-card" id="dish_card_${dish.id}">
                <div class="item-left">
                  <span class="item-indicator ${dish.isVeg ? 'veg' : 'nonveg'}"></span>
                  <div class="item-title">${dish.name}</div>
                  <div class="item-price">₹${dish.price}</div>
                  <div class="item-desc">${dish.description || ''}</div>
                  <div style="margin-top:0.4rem; font-size:0.8rem; font-weight:700; color:#24963f;">★ ${dish.rating || 4.5} rating</div>
                </div>
                <div class="item-right">
                  <img src="${dish.image}" alt="${dish.name}" class="item-thumb" loading="lazy">
                  <div class="add-btn-wrap" id="btn_wrap_${dish.id}">
                    ${qty > 0 ? `
                      <div class="qty-counter">
                        <button class="qty-btn" onclick="cartManager.updateItemQty('${dish.id}', -1)">-</button>
                        <span class="qty-num">${qty}</span>
                        <button class="qty-btn" onclick="cartManager.updateItemQty('${dish.id}', 1)">+</button>
                      </div>
                    ` : `
                      <button class="add-item-btn" onclick="cartManager.addItem(app.currentRestaurant, ${JSON.stringify(dish).replace(/"/g, '&quot;')})">
                        ADD +
                      </button>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  updateMenuCounters() {
    if (!this.currentRestaurant || !this.currentRestaurant.menu) return;

    this.currentRestaurant.menu.forEach(dish => {
      const wrap = document.getElementById(`btn_wrap_${dish.id}`);
      if (!wrap) return;

      const qty = cartManager.getItemQuantity(dish.id);
      if (qty > 0) {
        wrap.innerHTML = `
          <div class="qty-counter">
            <button class="qty-btn" onclick="cartManager.updateItemQty('${dish.id}', -1)">-</button>
            <span class="qty-num">${qty}</span>
            <button class="qty-btn" onclick="cartManager.updateItemQty('${dish.id}', 1)">+</button>
          </div>
        `;
      } else {
        wrap.innerHTML = `
          <button class="add-item-btn" onclick="cartManager.addItem(app.currentRestaurant, ${JSON.stringify(dish).replace(/"/g, '&quot;')})">
            ADD +
          </button>
        `;
      }
    });
  }

  scrollToMenuCat(cat, elem) {
    document.querySelectorAll('.menu-sidebar-item').forEach(e => e.classList.remove('active'));
    elem.classList.add('active');

    const target = document.getElementById(`cat_section_${cat.replace(/\s+/g, '_')}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  switchDetailTab(tabName, tabElem) {
    document.querySelectorAll('.detail-tabs .d-tab').forEach(b => b.classList.remove('active'));
    tabElem.classList.add('active');

    document.getElementById('tabMenuContent').classList.add('hidden');
    document.getElementById('tabOverviewContent').classList.add('hidden');
    document.getElementById('tabReviewsContent').classList.add('hidden');

    if (tabName === 'menu') document.getElementById('tabMenuContent').classList.remove('hidden');
    if (tabName === 'overview') {
      document.getElementById('tabOverviewContent').classList.remove('hidden');
      if (this.currentRestaurant) {
        mapManager.initMiniRestaurantMap(this.currentRestaurant.lat, this.currentRestaurant.lng, this.currentRestaurant.name);
      }
    }
    if (tabName === 'reviews') document.getElementById('tabReviewsContent').classList.remove('hidden');
  }

  renderReviews(restaurant) {
    const list = document.getElementById('reviewsList');
    if (!list) return;

    const mockReviews = [
      { author: 'Vikram S.', stars: 5, date: 'Yesterday', comment: 'Exceeded expectations! Food was piping hot, spices were perfectly balanced, and delivery took barely 20 mins.' },
      { author: 'Pooja Hegde', stars: 5, date: '3 days ago', comment: 'Hands down the best place in Koramangala. The packaging was spill-proof and neat.' },
      { author: 'Rahul Mehta', stars: 4, date: '1 week ago', comment: 'Great food quality, loved the naan and rich gravies. Will definitely reorder.' }
    ];

    list.innerHTML = mockReviews.map(rev => `
      <div class="review-item">
        <div class="rev-header">
          <span class="rev-author">${rev.author}</span>
          <span class="rev-stars">${'★'.repeat(rev.stars)}</span>
        </div>
        <p class="rev-comment">${rev.comment}</p>
        <span style="font-size:0.75rem; color:#9ca3af; margin-top:0.4rem; display:block;">Reviewed ${rev.date}</span>
      </div>
    `).join('');
  }

  async submitReview(event) {
    event.preventDefault();
    if (!this.currentRestaurant) return;

    const author = document.getElementById('reviewerName').value.trim();
    const rating = document.getElementById('reviewerRating').value;
    const comment = document.getElementById('reviewerComment').value.trim();

    try {
      const res = await fetch(`/api/restaurants/${this.currentRestaurant.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, rating, comment })
      });
      const data = await res.json();

      if (data.success) {
        this.showToast('Your review was posted!', 'success');
        const list = document.getElementById('reviewsList');
        const newRev = document.createElement('div');
        newRev.className = 'review-item';
        newRev.innerHTML = `
          <div class="rev-header">
            <span class="rev-author">${author} (You)</span>
            <span class="rev-stars">${'★'.repeat(Number(rating))}</span>
          </div>
          <p class="rev-comment">${comment}</p>
          <span style="font-size:0.75rem; color:#9ca3af; margin-top:0.4rem; display:block;">Just now</span>
        `;
        list.prepend(newRev);

        document.getElementById('reviewerComment').value = '';
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  }

  // --------------------------------------------------------------------------
  // NAVIGATION & VIEWS
  // --------------------------------------------------------------------------
  showHomeView(event) {
    if (event) event.preventDefault();
    document.getElementById('restaurantDetailView').classList.add('hidden');
    document.getElementById('orderTrackingView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showOrderTrackingView() {
    document.getElementById('restaurantDetailView').classList.add('hidden');
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('orderTrackingView').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  switchServiceTab(tab) {
    this.activeServiceTab = tab;
    document.querySelectorAll('.service-tab').forEach(t => t.classList.remove('active'));
    const clicked = document.querySelector(`.service-tab[data-tab="${tab}"]`);
    if (clicked) clicked.classList.add('active');

    const title = document.getElementById('gridSectionTitle');
    if (tab === 'delivery') title.innerText = `Delivery Restaurants in ${this.currentCity}`;
    if (tab === 'dining') title.innerText = `Dine-out Restaurants in ${this.currentCity}`;
    if (tab === 'nightlife') title.innerText = `Nightlife & Clubs in ${this.currentCity}`;

    this.loadRestaurants();
  }

  onCityChange(city) {
    this.currentCity = city;
    const title = document.getElementById('gridSectionTitle');
    if (title) title.innerText = `Delivery Restaurants in ${this.currentCity}`;
    this.loadRestaurants();
    this.showToast(`Switched city to ${this.currentCity}`, 'info');
  }

  onSearchInput(value) {
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
      if (value.trim()) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.searchQuery = value;
      this.loadRestaurants();
    }, 300);
  }

  clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    this.onSearchInput('');
  }

  // --------------------------------------------------------------------------
  // FILTERS
  // --------------------------------------------------------------------------
  toggleVegFilter() {
    this.isPureVeg = !this.isPureVeg;
    const btn = document.getElementById('filterVegBtn');
    if (btn) btn.classList.toggle('active', this.isPureVeg);
    this.checkFilterResetState();
    this.loadRestaurants();
  }

  toggleRatingFilter() {
    this.minRating = this.minRating ? null : 4.0;
    const btn = document.getElementById('filterRatingBtn');
    if (btn) btn.classList.toggle('active', !!this.minRating);
    this.checkFilterResetState();
    this.loadRestaurants();
  }

  toggleSpeedSort() {
    this.sortBy = this.sortBy === 'deliveryTime' ? null : 'deliveryTime';
    const btn = document.getElementById('filterSpeedBtn');
    if (btn) btn.classList.toggle('active', this.sortBy === 'deliveryTime');
    this.checkFilterResetState();
    this.loadRestaurants();
  }

  setSort(sortType) {
    this.sortBy = sortType;
    const label = document.getElementById('currentSortLabel');
    const sortNames = {
      'rating': 'Rating: High to Low',
      'deliveryTime': 'Delivery Time: Fastest',
      'costAsc': 'Cost: Low to High',
      'costDesc': 'Cost: High to Low'
    };
    if (label) label.innerText = sortNames[sortType] || 'Sort By';
    this.checkFilterResetState();
    this.loadRestaurants();
  }

  resetAllFilters() {
    this.isPureVeg = false;
    this.minRating = null;
    this.sortBy = null;
    this.selectedCategory = null;
    this.searchQuery = '';

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    document.getElementById('filterVegBtn')?.classList.remove('active');
    document.getElementById('filterRatingBtn')?.classList.remove('active');
    document.getElementById('filterSpeedBtn')?.classList.remove('active');
    const sortLabel = document.getElementById('currentSortLabel');
    if (sortLabel) sortLabel.innerText = 'Sort By';

    this.checkFilterResetState();
    this.loadCategories();
    this.loadRestaurants();
    this.showToast('All filters reset', 'info');
  }

  checkFilterResetState() {
    const resetBtn = document.getElementById('resetFiltersBtn');
    const isFiltered = this.isPureVeg || this.minRating || this.sortBy || this.selectedCategory || this.searchQuery;
    if (resetBtn) {
      if (isFiltered) resetBtn.classList.remove('hidden');
      else resetBtn.classList.add('hidden');
    }
  }

  // --------------------------------------------------------------------------
  // AUTH MODAL & TOAST
  // --------------------------------------------------------------------------
  openAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
  }

  closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
  }

  handleAuthSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('authName').value;
    this.closeAuthModal();
    this.showToast(`Welcome back, ${name}! Logged in successfully.`, 'success');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-bell');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Instantiate and attach to window
const app = new FeastifyApp();
window.app = app;
