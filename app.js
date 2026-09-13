// Data
import products from "./products.js";

const bannerData = {
  all: [
    'assets/banner/A83F2D3F-CC6A-419B-A2B6-3F02F031F141.png',
    'assets/banner/1C6A7276-7E73-43BD-AD0E-2E8846C0BE8A.png',
    'assets/banner/783F5407-1CBD-47AE-A608-1073F3D9970A.png'
  ],

  deals: [
    'assets/banner/1B04229C-524B-4963-BAFA-765007BADA61.png'
  ]
};

let cart = [];
let wishlist = [];
let currentModalProduct = null;
let selectedSize = 'M';

let currentBannerCategory = 'all';

function changeBanner(category) {
  const track = document.getElementById('banner-track');
  const dotsContainer = document.getElementById('banner-dots');

  if (!track || !dotsContainer) return;

  const banners = bannerData[category] || bannerData.all;

  currentBannerCategory = category;

  track.innerHTML = banners.map((src, index) => `
    <img
      src="${src}"
      alt="Haze promotional banner ${index + 1}"
      onerror="this.style.display='none'"
    >
  `).join('');

  dotsContainer.innerHTML = banners.map((_, index) => `
    <button
      class="banner-dot ${index === 0 ? 'active' : ''}"
      type="button"
      aria-label="Show banner ${index + 1}"
      onclick="window.showBanner(${index})"
    ></button>
  `).join('');

  currentBanner = 0;
  showBanner(0);
  restartBannerAutoPlay();
}

// Sort favorite products to the top
function sortProductsByWishlist(productList) {
  return [...productList].sort((a, b) => {
    const aFavorite = wishlist.includes(a.id);
    const bFavorite = wishlist.includes(b.id);

    if (aFavorite && !bFavorite) return -1;
    if (!aFavorite && bFavorite) return 1;

    return 0;
  });
}

// Render products
function renderProducts(containerId, filter = 'all') {
  const container = document.getElementById(containerId);
  if (!container) return;

  let filteredProducts = [...products];

  if (filter === 'new') {
    filteredProducts = filteredProducts.filter(p => p.tag === 'NEW');
  } else if (filter !== 'all') {
    filteredProducts = filteredProducts.filter(
      p => p.category === filter
    );
  }

  renderProductList(filteredProducts, container);
}

// Search products
function searchProducts(keyword) {
  const container = document.getElementById('shop-products');

  if (!container) return;

  const searchTerm = keyword.trim().toLowerCase();

  const results = products.filter(product => {
    const name = String(product.name || '').toLowerCase();
    const category = String(product.category || '').toLowerCase();
    const desc = String(product.desc || '').toLowerCase();

    return (
      name.includes(searchTerm) ||
      category.includes(searchTerm) ||
      desc.includes(searchTerm)
    );
  });

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-search">
        <div class="empty-icon-search">
          <img src="assets/icons/search.png" alt="Search">
        </div>

        <h3>No products found</h3>
        <p>Try searching for something else.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = results.map(p => `
    <div class="product-card" onclick="window.openModal(${p.id})">
      <div class="product-img">
        ${p.tag ? `<div class="product-tag">${p.tag}</div>` : ''}

        <img
          src="${p.image}"
          alt="${p.name}"
          class="product-thumb"
          onerror="this.style.display='none'"
        >
      </div>

      <div class="product-info">
        <div class="product-name">${p.name}</div>

        <div class="product-price">
          <div class="price-left">
            ฿${p.price.toLocaleString()}
            ${
              p.oldPrice
                ? `<span class="old">฿${p.oldPrice.toLocaleString()}</span>`
                : ''
            }
          </div>

          <button
            type="button"
            class="like-btn"
            onclick="event.stopPropagation(); window.toggleWishlist(${p.id}, this)"
          >
            <img
              src="${
                wishlist.includes(p.id)
                  ? 'assets/icons/fav.png'
                  : 'assets/icons/unfav.png'
              }"
              alt="Wishlist"
            >
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateQuickActions(category) {
  const quickActions = document.getElementById('quick-actions');

  if (!quickActions) return;

  if (category === 'all') {
    quickActions.classList.add('show');
  } else {
    quickActions.classList.remove('show');
  }
}

  // Render Wishlist
function renderWishlist() {
  const container = document.getElementById('wishlist-products');

  if (!container) return;

  const favoriteProducts = products.filter(product =>
    wishlist.includes(product.id)
  );

  if (favoriteProducts.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">
          <img src="assets/icons/favorite.png" alt="Empty wishlist">
        </div>
        <h3>Your wishlist is empty</h3>
        <p>Tap the heart icon to save products you love.</p>
        <button class="checkout-btn" onclick="navigate('shop')">
          Start Shopping
        </button>
      </div>
    `;

    return;
  }

  container.innerHTML = favoriteProducts.map(p => `
    <div class="product-card" onclick="openModal(${p.id})">
      <div class="product-img">
        ${p.tag ? `<div class="product-tag">${p.tag}</div>` : ''}

        <img
          src="${p.image}"
          alt="${p.name}"
          class="product-thumb"
          onerror="this.style.display='none'"
        >
      </div>

      <div class="product-info">
        <div class="product-name">${p.name}</div>

        <div class="product-price">
          <div class="price-left">
            ฿${p.price.toLocaleString()}
            ${
              p.oldPrice
                ? `<span class="old">
                    ฿${p.oldPrice.toLocaleString()}
                  </span>`
                : ''
            }
          </div>

          <button
            type="button"
            class="like-btn"
            onclick="event.stopPropagation(); window.toggleWishlist(${p.id}, this)"
          >
            <img
              src="assets/icons/fav.png"
              alt="Remove from wishlist"
            >
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Navigation
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
  });

  const targetPage = document.getElementById('page-' + page);

  if (targetPage) {
    targetPage.classList.add('active');
  }

  const activeNav = document.querySelector(
    `.nav-item[data-page="${page}"]`
  );

  if (activeNav) {
    activeNav.classList.add('active');
  }

  if (page === 'home') {
    renderProducts('home-products', 'new');
  }

  if (page === 'shop') {
    renderProducts('shop-products');
  }

  if (page === 'wishlist') {
    renderWishlist();
  }

  if (page === 'cart') {
    renderCart();
  }

  if (page === 'search') {
    renderSearchHistory();
  }
}

function setCategory(el) {
  document.querySelectorAll('.cat').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function filter(category, chip) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  renderProducts('shop-products', category);
}

function filterCategory(category, element) {
  document.querySelectorAll('.categories .cat').forEach(cat => {
    cat.classList.remove('active');
  });

  element.classList.add('active');

  // แสดง Quick Actions เฉพาะ For You
  updateQuickActions(category);

  // เปลี่ยน banner ตามหมวดหมู่
  changeBanner(category);

  // เปลี่ยนเฉพาะรายการสินค้า
  const container = document.getElementById('home-products');

  if (!container) return;

  let filteredProducts = [...products];

  if (category === 'all') {
    filteredProducts = filteredProducts.filter(
      product => product.tag === 'NEW'
    );
  } else if (category === 'deals') {
    filteredProducts = filteredProducts.filter(
      product => product.oldPrice
    );
  } else {
    filteredProducts = filteredProducts.filter(product =>
      String(product.category || '').toLowerCase() === category
    );
  }

  renderProductList(filteredProducts, container);
}

function renderProductList(productList, container) {
  if (!container) return;

  container.innerHTML = productList.map(p => `
    <div class="product-card" onclick="window.openModal(${p.id})">
      <div class="product-img">
        ${p.tag ? `<div class="product-tag">${p.tag}</div>` : ''}

        <img
          src="${p.image}"
          alt="${p.name}"
          class="product-thumb"
          onerror="this.style.display='none'"
        >
      </div>

      <div class="product-info">
        <div class="product-name">${p.name}</div>

        <div class="product-price">
          <div class="price-left">
            ฿${p.price.toLocaleString()}

            ${
              p.oldPrice
                ? `<span class="old">
                    ฿${p.oldPrice.toLocaleString()}
                  </span>`
                : ''
            }
          </div>

          <button
            type="button"
            class="like-btn"
            onclick="event.stopPropagation(); window.toggleWishlist(${p.id}, this)"
          >
            <img
              src="${
                wishlist.includes(p.id)
                  ? 'assets/icons/fav.png'
                  : 'assets/icons/unfav.png'
              }"
              alt="Wishlist"
            >
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Cart
function addToCart(productId, size = 'M') {
  const product = products.find(p => p.id === productId);

  if (!product) {
    showToast('Product not found');
    return;
  }

  const existing = cart.find(
    item => item.id === productId && item.size === size
  );

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      ...product,
      qty: 1,
      size: size
    });
  }

  updateCartBadge();
  renderCart();
  showToast('Added to cart!');
}

function removeFromCart(productId, size) {
  cart = cart.filter(item => !(item.id === productId && item.size === size));
  renderCart();
}

function updateQty(productId, size, delta) {
  const item = cart.find(item => item.id === productId && item.size === size);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) removeFromCart(productId, size);
    else renderCart();
  }
}

function changeCartSize(productId, oldSize, newSize) {
  const item = cart.find(
    item => item.id === productId && item.size === oldSize
  );

  if (!item || oldSize === newSize) return;

  // ถ้ามีสินค้าตัวเดียวกันและ Size ใหม่อยู่แล้ว
  const existing = cart.find(
    item => item.id === productId && item.size === newSize
  );

  if (existing) {
    existing.qty += item.qty;
    cart = cart.filter(
      item => !(item.id === productId && item.size === oldSize)
    );
  } else {
    item.size = newSize;
  }

  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon"><img src="assets/icons/shopping-bag.png" alt="Cart"></div>
        <h3>Your cart is empty</h3>
        <p>Start shopping to add items!</p>
      </div>
    `;
    footer.style.display = 'none';
  } else {
    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-img">
          <img src="${item.image}" alt="${item.name}" class="cart-thumb" onerror="this.style.display='none'">
        </div>
        <div class="cart-info">
          <div class="cart-name">${item.name}</div>
          <div class="cart-variant">
            <span>Size:</span>

            <select
              class="cart-size-select"
              onchange="changeCartSize(${item.id}, '${item.size}', this.value)"
            >
              <option value="S" ${item.size === 'S' ? 'selected' : ''}>S</option>
              <option value="M" ${item.size === 'M' ? 'selected' : ''}>M</option>
              <option value="L" ${item.size === 'L' ? 'selected' : ''}>L</option>
              <option value="XL" ${item.size === 'XL' ? 'selected' : ''}>XL</option>
              <option value="XXL" ${item.size === 'XXL' ? 'selected' : ''}>XXL</option>
            </select>

            <span>• Qty: ${item.qty}</span>
          </div>
          <div class="cart-price">฿${(item.price * item.qty).toLocaleString()}</div>
        </div>
        <div class="qty-control">
          <button onclick="updateQty(${item.id}, '${item.size}', -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="updateQty(${item.id}, '${item.size}', 1)">+</button>
        </div>
      </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    document.getElementById('cart-total').textContent = '฿' + total.toLocaleString();
    footer.style.display = 'flex';
  }

  document.getElementById('stat-orders').textContent = cart.reduce((s, i) => s + i.qty, 0);
}

function updateCartBadge() {
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const badge = document.getElementById('nav-badge');
  if (totalQty > 0) {
    badge.style.display = 'flex';
    badge.textContent = totalQty;
  } else {
    badge.style.display = 'none';
  }
}

function checkout() {
  if (cart.length === 0) return;
  showToast('Processing checkout...');
  setTimeout(() => {
    cart = [];
    updateCartBadge();
    renderCart();
    showToast('Order successfully!');
  }, 1500);
}

// Wishlist
function toggleWishlist(productId, btn) {
  const index = wishlist.indexOf(productId);

  if (index !== -1) {
    wishlist.splice(index, 1);
    showToast('Removed from wishlist');
  } else {
    wishlist.push(productId);
    showToast('Added to wishlist!');
  }

  const statWishlist = document.getElementById('stat-wishlist');

  if (statWishlist) {
    statWishlist.textContent = wishlist.length;
  }

  renderProducts('home-products', 'new');
  renderProducts('shop-products', 'all');
  renderWishlist();
}

// Modal
function openModal(productId) {
  const p = products.find(x => x.id === productId);
  currentModalProduct = p;
  document.getElementById('modal-img').innerHTML = `<img src="${p.image}" alt="${p.name}" class="modal-thumb" onerror="this.style.display='none'">`;
  document.getElementById('modal-title').textContent = p.name;
 document.getElementById('modal-price').innerHTML = '฿' + p.price.toLocaleString() + (p.oldPrice? ` <span style="font-size:14px;color:#999;text-decoration:line-through;">฿${p.oldPrice.toLocaleString()}</span>`: '');
  document.getElementById('modal-desc').textContent = p.desc;
  document.getElementById('modal-wishlist').innerHTML =
  wishlist.includes(productId)
    ? '<img src="assets/icons/fav.png" alt="Remove from wishlist">'
    : '<img src="assets/icons/unfav.png" alt="Add to wishlist">';
  document.getElementById('product-modal').classList.add('active');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('product-modal')) {
    document.getElementById('product-modal').classList.remove('active');
  }
}

function selectSize(btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedSize = btn.textContent;
}

function toggleModalWishlist() {
  if (!currentModalProduct) return;

  const productId = currentModalProduct.id;
  const idx = wishlist.indexOf(productId);

  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast('Removed from wishlist');
  } else {
    wishlist.push(productId);
    showToast('Added to wishlist!');
  }

  const statWishlist = document.getElementById('stat-wishlist');

  if (statWishlist) {
    statWishlist.textContent = wishlist.length;
  }

  const modalWishlist = document.getElementById('modal-wishlist');

  if (modalWishlist) {
    modalWishlist.innerHTML = wishlist.includes(productId)
      ? '<img src="assets/icons/fav.png" alt="Remove from wishlist">'
      : '<img src="assets/icons/unfav.png" alt="Add to wishlist">';
  }

  renderProducts('home-products', 'new');
  renderProducts('shop-products', 'all');

  renderWishlist();
}

// Toast
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// Banner slider
let currentBanner = 0;
let bannerTimer = null;

function showBanner(index) {
  const track = document.getElementById('banner-track');
  const dots = document.querySelectorAll('.banner-dot');

  if (!track || dots.length === 0) return;

  currentBanner = (index + dots.length) % dots.length;

  track.style.transform = `translateX(-${currentBanner * 100}%)`;

  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentBanner);
  });
}

function restartBannerAutoPlay() {
  clearInterval(bannerTimer);

  bannerTimer = setInterval(() => {
    showBanner(currentBanner + 1);
  }, 4500);
}

function initBannerSlider() {
  const slider = document.getElementById('banner-slider');
  const prev = document.getElementById('banner-prev');
  const next = document.getElementById('banner-next');

  if (!slider || !prev || !next) return;

  prev.onclick = () => {
    showBanner(currentBanner - 1);
    restartBannerAutoPlay();
  };

  next.onclick = () => {
    showBanner(currentBanner + 1);
    restartBannerAutoPlay();
  };

  slider.addEventListener('mouseenter', () => {
    clearInterval(bannerTimer);
  });

  slider.addEventListener('mouseleave', () => {
    restartBannerAutoPlay();
  });

  changeBanner('all');
}

window.showBanner = showBanner;
window.changeBanner = changeBanner;

initBannerSlider();

// Search page
let searchHistory = JSON.parse(
  localStorage.getItem('haze-search-history') || '[]'
);

function openSearchPage() {
  navigate('search');

  const input = document.getElementById('search-page-input');

  renderSearchHistory();

  setTimeout(() => {
    input.focus();
  }, 50);
}

function saveSearchHistory(keyword) {
  const term = keyword.trim();

  if (!term) return;

  searchHistory = searchHistory.filter(item => item !== term);
  searchHistory.unshift(term);

  // keep history to max 8 items
  searchHistory = searchHistory.slice(0, 8);

  localStorage.setItem(
    'haze-search-history',
    JSON.stringify(searchHistory)
  );

  renderSearchHistory();
}

function renderSearchHistory() {
  const container = document.getElementById('search-history');

  if (!container) return;

  if (searchHistory.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="search-history-title">
      <h3>Recent searches</h3>
      <button class="clear-history-btn" onclick="clearSearchHistory()">
        Clear all
      </button>
    </div>

    ${searchHistory.map(keyword => `
      <div class="history-item">
        <span onclick="useSearchHistory('${keyword.replace(/'/g, "\\'")}')">
          ${keyword}
        </span>

        <button onclick="removeSearchHistory('${keyword.replace(/'/g, "\\'")}')">
          ×
        </button>
      </div>
    `).join('')}
  `;
}

function useSearchHistory(keyword) {
  const input = document.getElementById('search-page-input');
  input.value = keyword;
  navigate('shop');
  searchProducts(keyword);
}

function removeSearchHistory(keyword) {
  searchHistory = searchHistory.filter(item => item !== keyword);

  localStorage.setItem(
    'haze-search-history',
    JSON.stringify(searchHistory)
  );

  renderSearchHistory();
}

function clearSearchHistory() {
  searchHistory = [];

  localStorage.removeItem('haze-search-history');

  renderSearchHistory();
}

function clearSearchPage() {
  const input = document.getElementById('search-page-input');

  input.value = '';
  input.focus();

  document.getElementById('search-page-results').innerHTML = '';
  renderSearchHistory();
}

function performSearchPage(keyword, saveHistory = false) {
  const results = products.filter(product => {
  const name = String(product.name || '').toLowerCase();
  const category = String(product.category || '').toLowerCase();
  const desc = String(product.desc || '').toLowerCase();

  return (
    name.includes(searchTerm) ||
    category.includes(searchTerm) ||
    desc.includes(searchTerm)
  );
});

  container.innerHTML = results.map(p => `
    <div class="product-card" onclick="openModal(${p.id})">
      <div class="product-img">
        ${p.tag ? `<div class="product-tag">${p.tag}</div>` : ''}

        <img
          src="${p.image}"
          alt="${p.name}"
          class="product-thumb"
          onerror="this.style.display='none'"
        >
      </div>

      <div class="product-info">
        <div class="product-name">${p.name}</div>

        <div class="product-price">
          <div class="price-left">
            ฿${p.price.toLocaleString()}
            ${
              p.oldPrice
                ? `<span class="old">฿${p.oldPrice.toLocaleString()}</span>`
                : ''
            }
          </div>

          <button
            class="like-btn"
            onclick="event.stopPropagation(); toggleWishlist(${p.id}, this)"
          >
            <img
              src="${
                wishlist.includes(p.id)
                  ? 'assets/icons/fav.png'
                  : 'assets/icons/unfav.png'
              }"
              alt="Wishlist"
            >
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

const searchPageInput = document.getElementById('search-page-input');

if (searchPageInput) {
  searchPageInput.addEventListener('input', function () {
    performSearchPage(this.value, false);
  });

  searchPageInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();

      const keyword = this.value.trim();

      if (!keyword) return;

      saveSearchHistory(keyword);

      navigate('shop');
      searchProducts(keyword);
    }
  });
}

function addFromModal() {
  if (!currentModalProduct) {
    showToast('Please select a product');
    return;
  }

  addToCart(currentModalProduct.id, selectedSize);
  closeModal();
}

// Init
renderProducts('home-products', 'new');
renderProducts('shop-products');

// Make functions available to inline HTML onclick handlers
window.navigate = navigate;
window.setCategory = setCategory;
window.filter = filter;
window.filterCategory = filterCategory;

window.openModal = openModal;
window.closeModal = closeModal;
window.selectSize = selectSize;
window.toggleWishlist = toggleWishlist;
window.toggleModalWishlist = toggleModalWishlist;
window.addFromModal = addFromModal;

window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.changeCartSize = changeCartSize;
window.checkout = checkout;

window.toggleWishlist = toggleWishlist;

window.openSearchPage = openSearchPage;
window.saveSearchHistory = saveSearchHistory;
window.useSearchHistory = useSearchHistory;
window.removeSearchHistory = removeSearchHistory;
window.clearSearchHistory = clearSearchHistory;
window.clearSearchPage = clearSearchPage;
window.performSearchPage = performSearchPage;
window.searchProducts = searchProducts;