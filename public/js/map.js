// ==========================================================================
// FEASTIFY - MAP API INTEGRATION (Leaflet & OpenStreetMap)
// Real-time GPS Tracking, City Explorer, & Dynamic Routing
// ==========================================================================

class MapManager {
  constructor() {
    this.cityMap = null;
    this.cityMarkersGroup = null;
    this.trackingMap = null;
    this.miniMap = null;
    
    // Tracking references
    this.trackingInterval = null;
    this.driverMarker = null;
    this.restMarker = null;
    this.userMarker = null;
    this.routeLine = null;
    this.currentTrackingOrderId = null;
  }

  // Custom marker generator helper
  createCustomIcon(iconHtml, className = 'custom-map-pin', iconSize = [40, 40]) {
    return L.divIcon({
      className: className,
      html: iconHtml,
      iconSize: iconSize,
      iconAnchor: [iconSize[0] / 2, iconSize[1]]
    });
  }

  // --------------------------------------------------------------------------
  // CITY FULL MAP MODAL
  // --------------------------------------------------------------------------
  toggleCityMapModal() {
    const modal = document.getElementById('cityMapModal');
    const isHidden = modal.classList.contains('hidden');

    if (isHidden) {
      modal.classList.remove('hidden');
      document.getElementById('mapCityName').innerText = app.currentCity;
      setTimeout(() => this.initCityFullMap(), 250);
    } else {
      modal.classList.add('hidden');
    }
  }

  initCityFullMap() {
    const mapElement = document.getElementById('cityFullMap');
    if (!mapElement) return;

    if (!this.cityMap) {
      this.cityMap = L.map('cityFullMap', {
        zoomControl: true,
        attributionControl: false
      }).setView([12.9716, 77.5946], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(this.cityMap);

      this.cityMarkersGroup = L.layerGroup().addTo(this.cityMap);
    }

    this.cityMarkersGroup.clearLayers();

    const restaurants = app.restaurantsList || [];
    if (restaurants.length === 0) return;

    const bounds = [];

    restaurants.forEach(rest => {
      if (!rest.lat || !rest.lng) return;

      const restIcon = this.createCustomIcon(`
        <div style="background:#e23744; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(226,55,68,0.4); border:2px solid white; font-size:16px;">
          <i class="fa-solid fa-utensils"></i>
        </div>
      `, 'rest-pin-marker', [36, 36]);

      const marker = L.marker([rest.lat, rest.lng], { icon: restIcon });

      const popupContent = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif; width:210px; padding:4px;">
          <img src="${rest.image}" style="width:100%; height:110px; object-fit:cover; border-radius:6px; margin-bottom:6px;">
          <div style="font-weight:700; font-size:14px; margin-bottom:2px; color:#1c1c1c;">${rest.name}</div>
          <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">${rest.area}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="background:#24963f; color:white; font-size:11px; font-weight:700; padding:2px 6px; border-radius:4px;">★ ${rest.rating}</span>
            <span style="font-size:12px; font-weight:600; color:#374151;">₹${rest.costForTwo} for two</span>
          </div>
          <button onclick="mapManager.toggleCityMapModal(); app.openRestaurant('${rest.id}')" style="background:#e23744; color:white; width:100%; padding:6px; border-radius:6px; font-weight:700; font-size:12px; border:none; cursor:pointer;">
            View Menu & Order
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      this.cityMarkersGroup.addLayer(marker);
      bounds.push([rest.lat, rest.lng]);
    });

    if (bounds.length > 0) {
      this.cityMap.fitBounds(bounds, { padding: [50, 50] });
    }
    this.cityMap.invalidateSize();
  }

  // --------------------------------------------------------------------------
  // MINI RESTAURANT OVERVIEW MAP
  // --------------------------------------------------------------------------
  initMiniRestaurantMap(lat, lng, name) {
    const elem = document.getElementById('restaurantMiniMap');
    if (!elem) return;

    if (this.miniMap) {
      this.miniMap.remove();
      this.miniMap = null;
    }

    setTimeout(() => {
      this.miniMap = L.map('restaurantMiniMap', {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.miniMap);

      const pinIcon = this.createCustomIcon(`
        <div style="background:#e23744; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); border:2px solid white; font-size:15px;">
          <i class="fa-solid fa-location-dot"></i>
        </div>
      `, 'mini-rest-pin', [34, 34]);

      L.marker([lat, lng], { icon: pinIcon }).addTo(this.miniMap)
        .bindPopup(`<strong>${name}</strong>`).openPopup();

      this.miniMap.invalidateSize();
    }, 200);
  }

  // --------------------------------------------------------------------------
  // LIVE GPS ORDER DELIVERY TRACKING
  // --------------------------------------------------------------------------
  startOrderTracking(orderId) {
    this.currentTrackingOrderId = orderId;
    app.showOrderTrackingView();

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    // Initial fetch
    this.fetchAndUpdateLiveTracking();

    // Poll live GPS tracking every 3 seconds for continuous route movement
    this.trackingInterval = setInterval(() => {
      this.fetchAndUpdateLiveTracking();
    }, 3000);
  }

  stopOrderTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  async fetchAndUpdateLiveTracking() {
    if (!this.currentTrackingOrderId) return;

    try {
      const res = await fetch(`/api/orders/${this.currentTrackingOrderId}/track`);
      const data = await res.json();
      if (!data.success) return;

      const track = data.data;
      this.updateTrackingUI(track);
      this.renderTrackingMap(track);

      // If order is delivered, stop polling after a short grace period
      if (track.status === 'DELIVERED') {
        setTimeout(() => this.stopOrderTracking(), 10000);
      }
    } catch (err) {
      console.error('Error fetching live tracking:', err);
    }
  }

  updateTrackingUI(track) {
    const title = document.getElementById('trackingStatusTitle');
    const msg = document.getElementById('trackingStatusMessage');
    const eta = document.getElementById('trackingEta');
    const driverName = document.getElementById('driverName');
    const bikeNum = document.getElementById('driverBikeNumber');

    if (title) title.innerText = track.statusMessage;
    if (msg) msg.innerText = `Status: ${track.status} • ${track.progressPercentage}% completed`;
    if (eta) eta.innerText = track.etaMinutes;
    if (driverName) driverName.innerText = track.driver.name;
    if (bikeNum) bikeNum.innerText = track.driver.bikeNumber;

    // Stepper updates
    const steps = ['PLACED', 'PREPARING', 'ON_THE_WAY', 'DELIVERED'];
    const currentIdx = steps.indexOf(track.status);
    const activeIndex = currentIdx === -1 ? (track.status === 'NEARBY' ? 2 : 1) : currentIdx;

    for (let i = 1; i <= 4; i++) {
      const stepElem = document.getElementById(`step${i}`);
      const lineElem = document.getElementById(`line${i}`);
      if (stepElem) {
        if (i - 1 <= activeIndex) {
          stepElem.classList.add('active');
        } else {
          stepElem.classList.remove('active');
        }
      }
      if (lineElem) {
        if (i - 1 < activeIndex) {
          lineElem.classList.add('active');
        } else {
          lineElem.classList.remove('active');
        }
      }
    }
  }

  renderTrackingMap(track) {
    const mapElement = document.getElementById('trackingLiveMap');
    if (!mapElement) return;

    const restCoord = [track.restaurantLocation.lat, track.restaurantLocation.lng];
    const userCoord = [track.customerLocation.lat, track.customerLocation.lng];
    const driverCoord = [track.currentDriverLocation.lat, track.currentDriverLocation.lng];

    if (!this.trackingMap) {
      this.trackingMap = L.map('trackingLiveMap', {
        zoomControl: true,
        attributionControl: false
      }).setView(driverCoord, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(this.trackingMap);
    }

    // 1. Restaurant Marker
    if (!this.restMarker) {
      const restIcon = this.createCustomIcon(`
        <div style="background:#1f2937; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(0,0,0,0.3); border:2px solid white; font-size:15px;">
          <i class="fa-solid fa-utensils"></i>
        </div>
      `, 'rest-track-pin', [34, 34]);
      this.restMarker = L.marker(restCoord, { icon: restIcon }).addTo(this.trackingMap);
      this.restMarker.bindPopup(`<b>Restaurant</b><br>${track.restaurantLocation.name}`);
    }

    // 2. User Delivery Destination Marker
    if (!this.userMarker) {
      const userIcon = this.createCustomIcon(`
        <div style="background:#10b981; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(16,185,129,0.4); border:2px solid white; font-size:15px;">
          <i class="fa-solid fa-house-chimney"></i>
        </div>
      `, 'user-track-pin', [34, 34]);
      this.userMarker = L.marker(userCoord, { icon: userIcon }).addTo(this.trackingMap);
      this.userMarker.bindPopup(`<b>Your Delivery Location</b><br>${track.customerLocation.address}`);
    }

    // 3. Driver Animated Bike Marker
    const bikeIcon = this.createCustomIcon(`
      <div style="position:relative;">
        <div style="background:#e23744; color:white; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(226,55,68,0.5); border:3px solid white; font-size:18px; transform: scale(1);">
          <i class="fa-solid fa-motorcycle"></i>
        </div>
        <div style="position:absolute; top:-4px; left:-4px; width:52px; height:52px; border-radius:50%; border:2px solid #e23744; opacity:0.6; animation:pulse 1.5s infinite;"></div>
      </div>
    `, 'driver-bike-pin', [44, 44]);

    if (!this.driverMarker) {
      this.driverMarker = L.marker(driverCoord, { icon: bikeIcon }).addTo(this.trackingMap);
      this.driverMarker.bindPopup(`<b>${track.driver.name}</b><br>Speeding with your order!`);
    } else {
      this.driverMarker.setLatLng(driverCoord);
    }

    // 4. Route Polyline
    if (this.routeLine) {
      this.trackingMap.removeLayer(this.routeLine);
    }
    this.routeLine = L.polyline([restCoord, driverCoord, userCoord], {
      color: '#e23744',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.85
    }).addTo(this.trackingMap);

    // Auto fit bounds smoothly
    const bounds = L.latLngBounds([restCoord, userCoord, driverCoord]);
    this.trackingMap.fitBounds(bounds, { padding: [60, 60] });
    this.trackingMap.invalidateSize();
  }
}

// Global Map Manager Instance
const mapManager = new MapManager();
window.mapManager = mapManager;
