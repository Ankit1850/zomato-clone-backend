# Feastify REST API Documentation

Base URL: `https://zomato-clone-backend-6ryn.onrender.com` (or `https://yourdomain.com`)

All API responses are formatted in JSON with a consistent schema:
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 1. System Endpoints

### `GET /health`
Returns service health status.
- **Response:**
  ```json
  {
    "status": "ok",
    "service": "Feastify API",
    "timestamp": "2026-10-19T06:23:33.050Z"
  }
  ```

---

## 2. Categories & Cities

### `GET /api/categories`
Returns all popular cuisine and dish categories (e.g., Biryani, Pizza, Burger, Desserts).

### `GET /api/cities`
Returns available delivery cities with coordinate centroids (Bengaluru, Mumbai, Delhi NCR, Hyderabad, Pune, Kolkata).

---

## 3. Restaurants

### `GET /api/restaurants`
Query and filter restaurants.

**Query Parameters:**
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `city` | string | Filter by city name (e.g., `Bengaluru`, `Mumbai`) |
| `isPureVeg` | boolean | Set to `true` to show only pure veg kitchens |
| `minRating` | number | Filter by minimum rating (e.g., `4.0`) |
| `category` | string | Filter by cuisine or dish category |
| `search` | string | Search keyword in restaurant name, area, cuisine, or dish |
| `sortBy` | string | `rating`, `deliveryTime`, `costAsc`, `costDesc` |

- **Sample Request:**
  ```bash
  curl -s "https://zomato-clone-backend-6ryn.onrender.com/api/restaurants?isPureVeg=false&minRating=4.0&sortBy=deliveryTime"
  ```

---

### `GET /api/restaurants/:id`
Fetch single restaurant by ID, including categorized full menu.

- **Sample Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "rest_1",
      "name": "Bikanervala & Royal Feast",
      "city": "Bengaluru",
      "area": "Koramangala 5th Block",
      "rating": 4.4,
      "costForTwo": 450,
      "lat": 12.9352,
      "lng": 77.6245,
      "categorizedMenu": {
        "Biryani": [ ... ],
        "Main Course": [ ... ],
        "Breads": [ ... ]
      }
    }
  }
  ```

---

### `POST /api/restaurants/:id/review`
Submit a customer review and star rating.

- **Request Body:**
  ```json
  {
    "author": "Ankit Sharma",
    "rating": 5,
    "comment": "Outstanding flavour and fast delivery!"
  }
  ```

---

## 4. Promo Codes & Discounts

### `POST /api/promo/validate`
Validate a coupon promo code against subtotal.

- **Request Body:**
  ```json
  {
    "code": "FEAST50",
    "subtotal": 500
  }
  ```
- **Active Codes:**
  - `FEAST50`: 50% discount up to ₹100
  - `WELCOME100`: Flat ₹100 discount on orders above ₹300
  - `FREESHIP`: 100% free delivery fee waiver

---

## 5. Orders & Live GPS Tracking

### `POST /api/orders`
Place a new food delivery order.

- **Request Body:**
  ```json
  {
    "restaurantId": "rest_1",
    "items": [
      { "id": "m1_1", "quantity": 2 },
      { "id": "m1_3", "quantity": 1 }
    ],
    "customer": {
      "name": "Ankit Sharma",
      "phone": "+91 98765 43210"
    },
    "deliveryAddress": {
      "flat": "Flat 402, Sunshine Heights",
      "landmark": "Near Central Park",
      "city": "Bengaluru"
    },
    "promoCode": "FEAST50",
    "tip": 20,
    "paymentMethod": "UPI"
  }
  ```

- **Response:**
  Returns order confirmation with unique `id`, breakdown of taxes and totals, driver assignment, and destination coordinates.

---

### `GET /api/orders/:id/track`
Real-time GPS tracking endpoint for an active order.

- **Sample Response:**
  ```json
  {
    "success": true,
    "data": {
      "orderId": "ORD_1132451",
      "status": "ON_THE_WAY",
      "statusMessage": "Delivery partner is speeding toward your location",
      "progressPercentage": 65,
      "etaMinutes": 6,
      "restaurantLocation": {
        "name": "Bikanervala & Royal Feast",
        "lat": 12.9352,
        "lng": 77.6245
      },
      "customerLocation": {
        "address": "Flat 402, Sunshine Heights, Near City Central Park",
        "lat": 12.9346,
        "lng": 77.6261
      },
      "currentDriverLocation": {
        "lat": 12.9349,
        "lng": 77.6253
      },
      "driver": {
        "name": "Ramesh Kumar",
        "phone": "+91 98112 34567",
        "bikeNumber": "KA 03 EQ 4521",
        "rating": 4.8
      }
    }
  }
  ```
