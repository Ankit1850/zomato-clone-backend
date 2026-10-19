# 🍔 Feastify - Next-Gen Zomato Clone Fullstack App

Feastify is a production-ready, fullstack food discovery and delivery web application built with the signature aesthetic and UX of **Zomato**. It features an integrated **Live Map API (Leaflet & OpenStreetMap)** with dynamic real-time driver GPS tracking, comprehensive REST API backend, cart management with discount vouchers, tipping, and deployment presets for Docker, Vercel, and Render.

![Feastify Banner](https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80)

---

## ✨ Features

- 🎨 **Zomato Signature Aesthetics:**
  - Modern Crimson Red (`#e23744`) brand theme.
  - Delivery, Dining Out, and Nightlife service switcher tabs.
  - Circular cuisine & cravings inspiration carousel (Biryani, Pizza, Burgers, Rolls, etc.).
  - Restaurant cards featuring dynamic discount ribbons (`50% OFF`), prep time badges, pure veg indicators, and star rating pills (`4.6 ★`).
- 🗺️ **Interactive Map API (OpenStreetMap & Leaflet.js):**
  - **Live GPS Order Tracking:** Real-time animated delivery driver bike icon moving continuously along route polyline from the restaurant to the customer doorstep.
  - **Live Dynamic ETA:** Real-time ETA minutes countdown and multi-step progress status (Order Placed ➔ Cooking ➔ On The Way ➔ Delivered).
  - **City Food Explorer Map:** Modal view plotting all restaurants with interactive popups, images, and 1-click menu navigation.
  - **Restaurant Mini-Map:** Geolocation pin for every restaurant in the Overview tab.
- 🛒 **Full-Featured Cart & Fast Checkout:**
  - Slide-over cart drawer with customizable item quantities (`+` / `-`).
  - Coupon discount engine (`FEAST50`, `WELCOME100`, `FREESHIP`).
  - Delivery rider tipping options (₹20, ₹30, ₹50).
  - Payment simulations: UPI (GPay/PhonePe/Paytm), Cards, and Cash on Delivery.
- ⚡ **Fullstack REST API Backend:**
  - Express.js backend serving JSON endpoints and static assets without requiring frontend bundlers.
  - Search engine across restaurant names, cuisines, dishes, and neighborhoods.
  - Filters for Pure Veg, 4.0+ Star Rating, Fastest Delivery, and Price sorting.
- 🚀 **Production Deployment & Custom Domain Ready:**
  - `Dockerfile` & `docker-compose.yml` for 1-command deployment.
  - `render.yaml` & `vercel.json` for 1-click cloud hosting.
  - Complete `DOMAIN_SETUP.md` with DNS, Nginx reverse proxy, and Let's Encrypt SSL instructions.

---

## 📁 Project Structure

```
feastify/
├── package.json               # Node.js dependencies & scripts
├── server.js                  # Express backend & REST API server
├── Dockerfile                 # Multi-stage container definition
├── docker-compose.yml         # Compose configuration
├── render.yaml                # 1-click Render cloud deploy
├── vercel.json                # Vercel serverless deployment
├── .env.example               # Environment template
├── DOMAIN_SETUP.md            # Custom domain, DNS, and SSL guide
├── API_DOCS.md                # Complete API endpoint documentation
├── README.md                  # Project overview
├── data/
│   ├── categories.json        # Food categories & imagery
│   ├── restaurants.json       # Restaurant list, coordinates, menus, ratings
│   └── orders.json            # Persistent order store
└── public/
    ├── index.html             # High-performance single page web app
    ├── css/
    │   └── style.css          # Zomato-identical stylesheet
    └── js/
        ├── app.js             # App controller, filtering, rendering
        ├── map.js             # Leaflet Map API & GPS tracking
        └── cart.js            # Cart state, coupons, checkout
```

---

## 🚀 Quickstart (Run Locally)

### 1. Clone & Enter Directory
```bash
cd c:\Users\dell\.gemini\antigravity\scratch\feastify
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Feastify Server
```bash
npm start
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🐳 Run with Docker

```bash
docker compose up -d
```
Visit `http://localhost:3000` to access the application.

---

## 🌐 Custom Domain Setup

See [DOMAIN_SETUP.md](DOMAIN_SETUP.md) for full instructions on setting up DNS A/CNAME records, Nginx reverse proxy, and free Let's Encrypt SSL certificates.

---

## 📡 API Reference

See [API_DOCS.md](API_DOCS.md) for complete endpoint documentation and curl examples.
