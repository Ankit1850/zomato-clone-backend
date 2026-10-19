const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Paths to JSON storage
const RESTAURANTS_FILE = path.join(__dirname, 'data', 'restaurants.json');
const CATEGORIES_FILE = path.join(__dirname, 'data', 'categories.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// Helper functions for reading/writing JSON
function readJSON(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Feastify API', timestamp: new Date().toISOString() });
});

// GET /api/categories
app.get('/api/categories', (req, res) => {
  const categories = readJSON(CATEGORIES_FILE, []);
  res.json({ success: true, count: categories.length, data: categories });
});

// GET /api/cities
app.get('/api/cities', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'blr', name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
      { id: 'del', name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
      { id: 'mum', name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      { id: 'hyd', name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
      { id: 'pune', name: 'Pune', lat: 18.5204, lng: 73.8567 },
      { id: 'kol', name: 'Kolkata', lat: 22.5726, lng: 88.3639 }
    ]
  });
});

// GET /api/restaurants
app.get('/api/restaurants', (req, res) => {
  let restaurants = readJSON(RESTAURANTS_FILE, []);
  const { search, category, isPureVeg, minRating, maxPrice, sortBy, city } = req.query;

  // City filter
  if (city) {
    restaurants = restaurants.filter(r => r.city.toLowerCase() === city.toLowerCase());
  }

  // Pure Veg
  if (isPureVeg === 'true' || isPureVeg === true) {
    restaurants = restaurants.filter(r => r.isPureVeg === true);
  }

  // Min Rating
  if (minRating) {
    const min = parseFloat(minRating);
    restaurants = restaurants.filter(r => r.rating >= min);
  }

  // Max Price for two
  if (maxPrice) {
    const max = parseFloat(maxPrice);
    restaurants = restaurants.filter(r => r.costForTwo <= max);
  }

  // Category filter
  if (category) {
    const catLower = category.toLowerCase();
    restaurants = restaurants.filter(r => {
      const matchCuisine = r.cuisines.some(c => c.toLowerCase().includes(catLower));
      const matchMenu = r.menu && r.menu.some(m => m.category.toLowerCase().includes(catLower) || m.name.toLowerCase().includes(catLower));
      return matchCuisine || matchMenu;
    });
  }

  // Search keyword (restaurant name, cuisines, menu items)
  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    restaurants = restaurants.filter(r => {
      const matchName = r.name.toLowerCase().includes(q);
      const matchArea = r.area.toLowerCase().includes(q);
      const matchCuisine = r.cuisines.some(c => c.toLowerCase().includes(q));
      const matchDish = r.menu && r.menu.some(item => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
      return matchName || matchArea || matchCuisine || matchDish;
    });
  }

  // Sorting
  if (sortBy === 'rating') {
    restaurants.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === 'deliveryTime') {
    restaurants.sort((a, b) => a.deliveryTime - b.deliveryTime);
  } else if (sortBy === 'costAsc') {
    restaurants.sort((a, b) => a.costForTwo - b.costForTwo);
  } else if (sortBy === 'costDesc') {
    restaurants.sort((a, b) => b.costForTwo - a.costForTwo);
  }

  res.json({
    success: true,
    total: restaurants.length,
    data: restaurants
  });
});

// GET /api/restaurants/:id
app.get('/api/restaurants/:id', (req, res) => {
  const restaurants = readJSON(RESTAURANTS_FILE, []);
  const restaurant = restaurants.find(r => r.id === req.params.id);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  // Categorize menu for display
  const categorizedMenu = {};
  if (restaurant.menu) {
    restaurant.menu.forEach(item => {
      if (!categorizedMenu[item.category]) {
        categorizedMenu[item.category] = [];
      }
      categorizedMenu[item.category].push(item);
    });
  }

  res.json({
    success: true,
    data: {
      ...restaurant,
      categorizedMenu
    }
  });
});

// POST /api/promo/validate
app.post('/api/promo/validate', (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Promo code required' });
  }

  const upper = code.trim().toUpperCase();
  let discount = 0;
  let message = '';

  if (upper === 'FEAST50') {
    discount = Math.min(Math.round(subtotal * 0.5), 100);
    message = '50% OFF up to ₹100 applied!';
  } else if (upper === 'WELCOME100') {
    discount = subtotal >= 300 ? 100 : 0;
    message = discount > 0 ? '₹100 Flat discount applied!' : 'Order must be ₹300 or more for WELCOME100';
  } else if (upper === 'FREESHIP') {
    discount = 35; // standard delivery fee waiver
    message = 'Free Delivery applied!';
  } else {
    return res.status(400).json({ success: false, message: 'Invalid coupon code. Try FEAST50, WELCOME100 or FREESHIP' });
  }

  res.json({
    success: true,
    code: upper,
    discount,
    message
  });
});

// POST /api/orders
app.post('/api/orders', (req, res) => {
  const { restaurantId, items, customer, deliveryAddress, promoCode, tip = 0, paymentMethod = 'COD' } = req.body;

  if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid order items or restaurant' });
  }

  const restaurants = readJSON(RESTAURANTS_FILE, []);
  const restaurant = restaurants.find(r => r.id === restaurantId);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  // Calculate pricing
  let subtotal = 0;
  const processedItems = items.map(item => {
    const menuItem = restaurant.menu.find(m => m.id === item.id);
    const price = menuItem ? menuItem.price : item.price;
    const name = menuItem ? menuItem.name : item.name;
    const isVeg = menuItem ? menuItem.isVeg : true;
    const itemTotal = price * item.quantity;
    subtotal += itemTotal;
    return {
      id: item.id,
      name,
      price,
      quantity: item.quantity,
      isVeg,
      itemTotal
    };
  });

  // Discounts
  let discount = 0;
  if (promoCode) {
    const p = promoCode.toUpperCase();
    if (p === 'FEAST50') discount = Math.min(Math.round(subtotal * 0.5), 100);
    if (p === 'WELCOME100' && subtotal >= 300) discount = 100;
    if (p === 'FREESHIP') discount = 35;
  }

  const deliveryFee = promoCode === 'FREESHIP' ? 0 : 35;
  const gstAndCharges = Math.round(subtotal * 0.05); // 5% GST
  const platformFee = 6;
  const grandTotal = Math.max(0, subtotal - discount + deliveryFee + gstAndCharges + platformFee + Number(tip));

  // Realistic mock delivery rider & user destination coords near restaurant
  const userLat = restaurant.lat + (Math.random() * 0.02 - 0.01);
  const userLng = restaurant.lng + (Math.random() * 0.02 - 0.01);

  const newOrder = {
    id: 'ORD_' + Date.now().toString().slice(-7),
    createdAt: new Date().toISOString(),
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      area: restaurant.area,
      image: restaurant.image,
      lat: restaurant.lat,
      lng: restaurant.lng
    },
    items: processedItems,
    pricing: {
      subtotal,
      discount,
      deliveryFee,
      gstAndCharges,
      platformFee,
      tip: Number(tip),
      grandTotal
    },
    customer: customer || { name: 'Foodie Enthusiast', phone: '+91 98765 43210' },
    deliveryAddress: deliveryAddress || {
      flat: 'Flat 402, Sunshine Heights',
      landmark: 'Near City Central Park',
      city: restaurant.city,
      lat: userLat,
      lng: userLng
    },
    paymentMethod,
    driver: {
      name: 'Ramesh Kumar',
      phone: '+91 98112 34567',
      bikeNumber: 'KA 03 EQ 4521',
      rating: 4.8,
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    durationMinutes: 15,
    status: 'PLACED' // PLACED -> PREPARING -> ON_THE_WAY -> DELIVERED
  };

  const orders = readJSON(ORDERS_FILE, []);
  orders.unshift(newOrder);
  writeJSON(ORDERS_FILE, orders);

  res.status(201).json({
    success: true,
    message: 'Order placed successfully!',
    data: newOrder
  });
});

// GET /api/orders/:id/track
app.get('/api/orders/:id/track', (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  const order = orders.find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Calculate live timeline progress based on elapsed seconds
  const orderTime = new Date(order.createdAt).getTime();
  const now = Date.now();
  const elapsedSec = (now - orderTime) / 1000;
  const totalSec = (order.durationMinutes || 15) * 60;
  // Progress ratio 0.0 to 1.0 (simulation: accelerates if requested in demo mode)
  // Demo mode: 1 real second = 10 simulation seconds so tracking is interactive in real-time
  const simulatedSec = elapsedSec * 10;
  const progress = Math.min(1.0, simulatedSec / totalSec);

  let status = 'PLACED';
  let statusMessage = 'Order confirmed by restaurant';
  let currentLat = order.restaurant.lat;
  let currentLng = order.restaurant.lng;

  if (progress < 0.20) {
    status = 'PREPARING';
    statusMessage = 'Chef is preparing your delicious meal with care';
  } else if (progress < 0.85) {
    status = 'ON_THE_WAY';
    statusMessage = 'Delivery partner is speeding toward your location';
    // Linear coordinate interpolation between restaurant and user drop location
    const t = (progress - 0.20) / (0.85 - 0.20);
    currentLat = order.restaurant.lat + (order.deliveryAddress.lat - order.restaurant.lat) * t;
    currentLng = order.restaurant.lng + (order.deliveryAddress.lng - order.restaurant.lng) * t;
  } else if (progress < 1.0) {
    status = 'NEARBY';
    statusMessage = 'Delivery partner is within 200m of your doorstep!';
    currentLat = order.deliveryAddress.lat - 0.0003;
    currentLng = order.deliveryAddress.lng - 0.0003;
  } else {
    status = 'DELIVERED';
    statusMessage = 'Order delivered! Savor every bite.';
    currentLat = order.deliveryAddress.lat;
    currentLng = order.deliveryAddress.lng;
  }

  const remainingMinutes = Math.max(0, Math.ceil(((1.0 - progress) * order.durationMinutes)));

  res.json({
    success: true,
    data: {
      orderId: order.id,
      status,
      statusMessage,
      progressPercentage: Math.round(progress * 100),
      etaMinutes: remainingMinutes,
      restaurantLocation: {
        name: order.restaurant.name,
        lat: order.restaurant.lat,
        lng: order.restaurant.lng
      },
      customerLocation: {
        address: `${order.deliveryAddress.flat}, ${order.deliveryAddress.landmark}`,
        lat: order.deliveryAddress.lat,
        lng: order.deliveryAddress.lng
      },
      currentDriverLocation: {
        lat: currentLat,
        lng: currentLng
      },
      driver: order.driver
    }
  });
});

// GET /api/orders (all orders)
app.get('/api/orders', (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  res.json({ success: true, count: orders.length, data: orders });
});

// POST /api/restaurants/:id/review
app.post('/api/restaurants/:id/review', (req, res) => {
  const { author, rating, comment } = req.body;
  if (!rating || !comment) {
    return res.status(400).json({ success: false, message: 'Rating and comment are required' });
  }

  const restaurants = readJSON(RESTAURANTS_FILE, []);
  const restIndex = restaurants.findIndex(r => r.id === req.params.id);
  if (restIndex === -1) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  const r = restaurants[restIndex];
  const newCount = (r.reviewCount || 100) + 1;
  const newRating = Number((((r.rating * (newCount - 1)) + Number(rating)) / newCount).toFixed(1));

  r.rating = newRating;
  r.reviewCount = newCount;
  writeJSON(RESTAURANTS_FILE, restaurants);

  res.json({
    success: true,
    message: 'Review recorded!',
    data: { newRating, reviewCount: newCount }
  });
});

// Catch-all to serve index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Feastify Fullstack Server is LIVE!`);
  console.log(`📍 Web Application: https://zomato-clone-backend-6ryn.onrender.com${PORT}`);
  console.log(`📡 API Endpoints:  https://zomato-clone-backend-6ryn.onrender.com${PORT}/api/restaurants`);
  console.log(`🗺️ Map Engine:      OpenStreetMap + Leaflet.js Ready`);
  console.log(`===============================================`);
});
