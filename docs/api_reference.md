# 10Min Help — API Reference Specification

All REST endpoints are versioned under `/api/v1` and communicate via JSON.

---

## 1. Authentication (`/api/v1/auth`)

### `POST /auth/send-otp`
Dispatches a 6-digit one-time password to the specified phone number.
- **Request Body**:
  ```json
  {
    "phone": "9876543210",
    "role": "CUSTOMER"
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "message": "OTP sent successfully to registered mobile number.",
    "data": { "devOtp": "123456" }
  }
  ```

### `POST /auth/verify-otp`
Verifies OTP code and returns access/refresh JWT tokens.
- **Request Body**:
  ```json
  {
    "phone": "9876543210",
    "otp": "123456",
    "name": "Rahul Sharma"
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "_id": "...", "name": "Rahul Sharma", "role": "CUSTOMER", "phone": "9876543210" },
      "tokens": { "accessToken": "...", "refreshToken": "...", "expiresIn": 900 }
    }
  }
  ```

---

## 2. Customer Vehicles (`/api/v1/vehicles`)
*Requires `Authorization: Bearer <token>`.*

- `GET /vehicles`: List saved vehicles for authenticated customer.
- `POST /vehicles`: Add a new bike or car.
- `PATCH /vehicles/:id`: Update vehicle details.
- `DELETE /vehicles/:id`: Remove vehicle.

---

## 3. Services Catalogue (`/api/v1/services`)

- `GET /services`: Retrieve active emergency services. Optional query parameter `?vehicleType=BIKE|CAR`.
- `GET /services/:id`: Retrieve service details and starting price.
- `GET /services/quote?serviceId=...&vehicleType=...`: Calculate starting rate and estimated repair duration.

---

## 4. Bookings & Lifecycle (`/api/v1/bookings`)
*Requires `Authorization: Bearer <token>`.*

### `POST /bookings`
Creates a roadside assistance ticket and immediately triggers the automatic dispatch engine.
- **Request Body**:
  ```json
  {
    "vehicleId": "64f1...",
    "serviceId": "64f2...",
    "pickupLocation": {
      "latitude": 12.9784,
      "longitude": 77.6408,
      "address": "100ft Road, Indiranagar, Bengaluru",
      "landmark": "Near Metro Pillar 120"
    },
    "notes": "Rear tyre puncture"
  }
  ```

### `GET /bookings/:id`
Retrieves ticket status, assigned technician profile, agreed price, and status history.

### `POST /bookings/:id/cancel`
Cancels booking according to cancellation policy.
- **Request Body**: `{ "reason": "Customer resolved issue" }`

### `POST /bookings/:id/propose-quote` *(Technician Role)*
Submits a revised quotation after physical vehicle inspection.
- **Request Body**:
  ```json
  {
    "revisedAmount": 250,
    "reason": "Secondary tube leak requires vulcanized patch"
  }
  ```

### `POST /bookings/:id/respond-quote` *(Customer Role)*
Approves or declines technician's revised quotation.
- **Request Body**: `{ "approved": true }`

### `POST /bookings/:id/status` *(Technician Role)*
Advances booking state according to canonical state machine:
- `EN_ROUTE` -> `ARRIVED` -> `INSPECTING` -> `IN_PROGRESS` -> `COMPLETED`.

---

## 5. Dispatch Engine (`/api/v1/dispatch`)
*Requires Technician Authorization.*

- `POST /dispatch/offers/:offerId/accept`: Atomically claims booking within 15-second window.
- `POST /dispatch/offers/:offerId/reject`: Declines offer, triggering immediate retry to next ranked technician.

---

## 6. Payments (`/api/v1/payments`)
*Requires `Authorization: Bearer <token>`.*

- `POST /payments/orders`: Creates payment gateway order (Razorpay / Sandbox).
- `POST /payments/verify`: Verifies cryptographic HMAC-SHA256 signature.
- `POST /payments/cash`: Records cash payment collected on site.

---

## 7. Reviews (`/api/v1/reviews`)

- `POST /reviews`: Submits 1–5 star rating and comment for a completed booking.

---

## 8. Admin Operations (`/api/v1/admin`)
*Requires Admin or Dispatcher Role.*

- `GET /admin/metrics`: Real aggregated database KPIs.
- `GET /admin/live-map`: Active telemetry and online mechanics.
- `GET /admin/bookings`: Searchable, paginated tickets table.
- `POST /admin/bookings/:id/assign`: Manual technician assignment override.
- `GET /admin/technicians`: Fleet roster and applicant verification queue.
- `PATCH /admin/technicians/:id/verification`: Approve, reject, or suspend technicians.
- `PATCH /admin/services/:id`: Dynamic pricing matrix editor.
- `GET /admin/audit-logs`: Immutable system audit trail.

---

## 9. Real-Time Socket.IO Specification

### Connection Handshake
- Connect to `http://localhost:5001` with `auth: { token: "<JWT_ACCESS_TOKEN>" }`.
- Automatically joins room `user:<userId>`.
- Technicians join `technician:<technicianId>`.
- Administrators join `admin:dispatch`.

### Room Events
- Client emits `join:booking` with `{ bookingId }` to receive real-time ticket updates.
- Events emitted by server:
  - `booking:searching`: Notifies customer that 15s candidate offers are active.
  - `booking:offer`: Dispatches 15s offer payload to technician.
  - `booking:assigned`: Notifies customer of assigned technician profile and ETA.
  - `booking:status`: Broadcasts state changes (`EN_ROUTE`, `ARRIVED`, `COMPLETED`, etc.).
  - `booking:quote-updated`: Alerts customer when quote is revised.
  - `tracking:location`: Broadcasts technician live coordinates and updated ETA.
  - `payment:updated`: Alerts participants when payment is completed.
