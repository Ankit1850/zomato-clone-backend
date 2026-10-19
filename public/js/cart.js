// ==========================================================================
// FEASTIFY - CART & CHECKOUT MANAGER
// ==========================================================================

class CartManager {
  constructor() {
    this.cart = this.loadCartFromStorage();
    this.appliedCoupon = null;
    this.tipAmount = 20;
    this.deliveryFee = 35;
    this.platformFee = 6;
  }

  loadCartFromStorage() {
    try {
      const saved = localStorage.getItem('feastify_cart');
      return saved ? JSON.parse(saved) : { restaurant: null, items: [] };
    } catch (e) {
      return { restaurant: null, items: [] };
    }
  }

  saveCartToStorage() {
    try {
      localStorage.setItem('feastify_cart', JSON.stringify(this.cart));
      this.updateCartBadge();
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  }

  getItemQuantity(itemId) {
    const item = this.cart.items.find(i => i.id === itemId);
    return item ? item.quantity : 0;
  }

  addItem(restaurant, menuItem) {
    // If cart has items from another restaurant, confirm reset
    if (this.cart.restaurant && this.cart.restaurant.id !== restaurant.id && this.cart.items.length > 0) {
      const confirmReset = confirm(`Your cart has items from "${this.cart.restaurant.name}". Discard and start new order from "${restaurant.name}"?`);
      if (!confirmReset) return false;
      this.clearCart();
    }

    this.cart.restaurant = {
      id: restaurant.id,
      name: restaurant.name,
      area: restaurant.area,
      city: restaurant.city,
      lat: restaurant.lat,
      lng: restaurant.lng,
      image: restaurant.image
    };

    const existing = this.cart.items.find(i => i.id === menuItem.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.items.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        isVeg: menuItem.isVeg,
        image: menuItem.image,
        quantity: 1
      });
    }

    this.saveCartToStorage();
    this.renderCartDrawer();
    app.updateMenuCounters();
    app.showToast(`Added "${menuItem.name}" to cart!`, 'success');
    return true;
  }

  updateItemQty(itemId, change) {
    const itemIndex = this.cart.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    this.cart.items[itemIndex].quantity += change;
    if (this.cart.items[itemIndex].quantity <= 0) {
      this.cart.items.splice(itemIndex, 1);
    }

    if (this.cart.items.length === 0) {
      this.cart.restaurant = null;
      this.appliedCoupon = null;
    }

    this.saveCartToStorage();
    this.renderCartDrawer();
    this.renderCheckoutBill();
    app.updateMenuCounters();
  }

  clearCart() {
    this.cart = { restaurant: null, items: [] };
    this.appliedCoupon = null;
    this.saveCartToStorage();
    this.renderCartDrawer();
    app.updateMenuCounters();
  }

  getTotalCount() {
    return this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSubtotal() {
    return this.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  calculateBill() {
    const subtotal = this.getSubtotal();
    let discount = 0;

    if (this.appliedCoupon) {
      const c = this.appliedCoupon.toUpperCase();
      if (c === 'FEAST50') {
        discount = Math.min(Math.round(subtotal * 0.5), 100);
      } else if (c === 'WELCOME100') {
        discount = subtotal >= 300 ? 100 : 0;
      } else if (c === 'FREESHIP') {
        discount = this.deliveryFee;
      }
    }

    const currentDeliveryFee = (this.appliedCoupon === 'FREESHIP' || subtotal === 0) ? 0 : this.deliveryFee;
    const gstAndCharges = Math.round(subtotal * 0.05);
    const platformFee = subtotal > 0 ? this.platformFee : 0;
    const grandTotal = Math.max(0, subtotal - discount + currentDeliveryFee + gstAndCharges + platformFee + this.tipAmount);

    return {
      subtotal,
      discount,
      deliveryFee: currentDeliveryFee,
      gstAndCharges,
      platformFee,
      tip: this.tipAmount,
      grandTotal
    };
  }

  updateCartBadge() {
    const badge = document.getElementById('cartCountBadge');
    if (!badge) return;
    const count = this.getTotalCount();
    badge.innerText = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  openCartDrawer() {
    this.renderCartDrawer();
    document.getElementById('cartDrawerOverlay').classList.remove('hidden');
  }

  closeCartDrawer(event) {
    if (event && event.target && event.target.id !== 'cartDrawerOverlay' && !event.target.closest('.drawer-close-btn')) {
      return;
    }
    document.getElementById('cartDrawerOverlay').classList.add('hidden');
  }

  renderCartDrawer() {
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');
    if (!body || !footer) return;

    if (this.cart.items.length === 0) {
      body.innerHTML = `
        <div class="empty-cart-state">
          <div class="empty-cart-icon"><i class="fa-solid fa-basket-shopping"></i></div>
          <h3>Your cart is empty</h3>
          <p style="color:#828282; margin: 0.5rem 0 1.5rem;">Good food is always just a few clicks away. Explore top restaurants now!</p>
          <button class="primary-btn" onclick="cartManager.closeCartDrawer(); app.showHomeView();">Browse Restaurants</button>
        </div>
      `;
      footer.innerHTML = '';
      return;
    }

    const bill = this.calculateBill();

    body.innerHTML = `
      <div class="cart-restaurant-tag">
        <i class="fa-solid fa-store"></i>
        <span>Ordering from: <strong>${this.cart.restaurant.name}</strong> (${this.cart.restaurant.area})</span>
      </div>

      <div class="cart-items-list">
        ${this.cart.items.map(item => `
          <div class="cart-item-row">
            <div class="cart-item-info">
              <span class="item-indicator ${item.isVeg ? 'veg' : 'nonveg'}"></span>
              <span class="cart-item-name">${item.name}</span>
            </div>
            <div class="cart-item-controls">
              <div class="qty-counter">
                <button class="qty-btn" onclick="cartManager.updateItemQty('${item.id}', -1)">-</button>
                <span class="qty-num">${item.quantity}</span>
                <button class="qty-btn" onclick="cartManager.updateItemQty('${item.id}', 1)">+</button>
              </div>
              <span style="font-weight:700; min-width: 60px; text-align:right;">₹${item.price * item.quantity}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="cart-suggestion-box" style="background:#f9fafb; border-radius:8px; padding:0.75rem 1rem; margin-bottom:1rem; font-size:0.85rem; color:#4b5563;">
        <i class="fa-solid fa-shield-halved" style="color:#10b981; margin-right:4px;"></i>
        Contactless delivery enabled. Safe & hygienic packaging guaranteed.
      </div>
    `;

    footer.innerHTML = `
      <div class="bill-row">
        <span>Item Subtotal</span>
        <span>₹${bill.subtotal}</span>
      </div>
      ${bill.discount > 0 ? `
        <div class="bill-row" style="color:#10b981; font-weight:600;">
          <span>Coupon Discount (${this.appliedCoupon})</span>
          <span>- ₹${bill.discount}</span>
        </div>
      ` : ''}
      <div class="bill-row">
        <span>Delivery Partner Fee</span>
        <span>₹${bill.deliveryFee}</span>
      </div>
      <div class="bill-row">
        <span>Taxes & Restaurant Charges (5%)</span>
        <span>₹${bill.gstAndCharges}</span>
      </div>
      <div class="bill-row">
        <span>Platform Fee</span>
        <span>₹${bill.platformFee}</span>
      </div>
      <div class="bill-row total-row">
        <span>To Pay</span>
        <span>₹${bill.grandTotal}</span>
      </div>

      <button class="primary-btn full-btn mt-3 pulse-glow" onclick="cartManager.openCheckoutModal()">
        <span>Proceed to Checkout</span>
        <span>₹${bill.grandTotal}</span>
      </button>
    `;
  }

  openCheckoutModal() {
    this.closeCartDrawer();
    this.renderCheckoutBill();
    document.getElementById('checkoutModal').classList.remove('hidden');
  }

  closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.add('hidden');
  }

  quickCoupon(code) {
    document.getElementById('promoCodeInput').value = code;
    this.applyCoupon();
  }

  applyCoupon() {
    const input = document.getElementById('promoCodeInput');
    const msg = document.getElementById('promoMessage');
    const code = input ? input.value.trim().toUpperCase() : '';

    if (!code) {
      this.appliedCoupon = null;
      if (msg) msg.innerHTML = '';
      this.renderCheckoutBill();
      this.renderCartDrawer();
      return;
    }

    const subtotal = this.getSubtotal();

    if (code === 'FEAST50') {
      this.appliedCoupon = 'FEAST50';
      const disc = Math.min(Math.round(subtotal * 0.5), 100);
      msg.innerHTML = `<span style="color:#10b981;">🎉 FEAST50 applied! You saved ₹${disc}</span>`;
    } else if (code === 'WELCOME100') {
      if (subtotal < 300) {
        msg.innerHTML = `<span style="color:#e11d48;">Order must be ₹300 or more to apply WELCOME100</span>`;
        return;
      }
      this.appliedCoupon = 'WELCOME100';
      msg.innerHTML = `<span style="color:#10b981;">🎉 WELCOME100 applied! You saved ₹100</span>`;
    } else if (code === 'FREESHIP') {
      this.appliedCoupon = 'FREESHIP';
      msg.innerHTML = `<span style="color:#10b981;">🎉 Free Delivery unlocked! Saved ₹35</span>`;
    } else {
      msg.innerHTML = `<span style="color:#e11d48;">Invalid coupon code</span>`;
      return;
    }

    this.renderCheckoutBill();
    this.renderCartDrawer();
  }

  setTip(amount, buttonElement) {
    this.tipAmount = Number(amount);
    document.querySelectorAll('.tip-btn').forEach(b => b.classList.remove('active'));
    if (buttonElement) buttonElement.classList.add('active');
    this.renderCheckoutBill();
    this.renderCartDrawer();
  }

  renderCheckoutBill() {
    const summary = document.getElementById('checkoutBillSummary');
    const finalBtnAmount = document.getElementById('finalCheckoutAmount');
    if (!summary) return;

    const bill = this.calculateBill();
    if (finalBtnAmount) finalBtnAmount.innerText = `₹${bill.grandTotal}`;

    summary.innerHTML = `
      <div class="bill-row">
        <span>Item Total (${this.getTotalCount()} items)</span>
        <span>₹${bill.subtotal}</span>
      </div>
      ${bill.discount > 0 ? `
        <div class="bill-row" style="color:#10b981; font-weight:600;">
          <span>Coupon Discount (${this.appliedCoupon})</span>
          <span>- ₹${bill.discount}</span>
        </div>
      ` : ''}
      <div class="bill-row">
        <span>Delivery Fee</span>
        <span>₹${bill.deliveryFee}</span>
      </div>
      <div class="bill-row">
        <span>Taxes & GST (5%)</span>
        <span>₹${bill.gstAndCharges}</span>
      </div>
      <div class="bill-row">
        <span>Platform Fee</span>
        <span>₹${bill.platformFee}</span>
      </div>
      ${bill.tip > 0 ? `
        <div class="bill-row">
          <span>Driver Tip</span>
          <span>₹${bill.tip}</span>
        </div>
      ` : ''}
      <div class="bill-row total-row">
        <span>Grand Total</span>
        <span>₹${bill.grandTotal}</span>
      </div>
    `;
  }

  async handleOrderPlacement(event) {
    event.preventDefault();
    if (this.cart.items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const landmark = document.getElementById('custLandmark').value.trim();
    const payMethod = document.querySelector('input[name="paymentOption"]:checked')?.value || 'COD';

    const orderPayload = {
      restaurantId: this.cart.restaurant.id,
      items: this.cart.items,
      customer: { name, phone },
      deliveryAddress: {
        flat: address,
        landmark: landmark,
        city: this.cart.restaurant.city,
        lat: this.cart.restaurant.lat + 0.009,
        lng: this.cart.restaurant.lng + 0.009
      },
      promoCode: this.appliedCoupon,
      tip: this.tipAmount,
      paymentMethod: payMethod
    };

    const submitBtn = document.getElementById('payAndPlaceOrderBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Placing your Feast Order...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const result = await response.json();

      if (result.success) {
        const orderData = result.data;
        this.clearCart();
        this.closeCheckoutModal();
        app.showToast('Order Placed Successfully! Initializing Live GPS Map...', 'success');
        
        // Open Live Order Tracking View
        mapManager.startOrderTracking(orderData.id);
      } else {
        alert(result.message || 'Failed to place order.');
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Error communicating with Feastify API.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Place Order</span> <span id="finalCheckoutAmount">₹0</span>`;
      this.renderCheckoutBill();
    }
  }
}

// Global Cart Manager Instance
const cartManager = new CartManager();
window.cartManager = cartManager;
