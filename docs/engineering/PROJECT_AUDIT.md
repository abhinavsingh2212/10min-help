# 10Min Help — Master Engineering Project Audit

**Repository:** `https://github.com/abhinavsingh2212/10min-help`  
**Working Branch:** `exp/10min-help-full-audit`  
**Baseline Commit:** `4d2375c8136444cac7312d67a6599847b018abc1` (`main`)  
**Audit Date:** 2026-10-15

---

## 1. Complete Repository Inventory

### 1.1 Applications & Workspace Packages

| Package Name | Path | Stack | Purpose |
|---|---|---|---|
| `@10min-help/shared` | `packages/shared` | TypeScript, Zod | Canonical enums, service catalogue constants, state machine transitions, DTOs, and Zod request schemas |
| `@10min-help/backend` | `backend` | Node.js, Express, TypeScript, Mongoose, Socket.IO, Winston | REST API (`/api/v1`), Socket.IO real-time hub, 15s timed dispatch engine, background offer expiry worker, MongoDB persistence |
| `@10min-help/customer-web` | `web/customer-web` | Next.js 14 (App Router), TypeScript, Tailwind CSS, Socket.IO Client | Customer web portal for service discovery, instant booking, live tracking, quote approval, payments, and reviews |
| `@10min-help/admin-web` | `web/admin-web` | Next.js 14 (App Router), TypeScript, Tailwind CSS | Operations & dispatch console for KPIs, live dispatch telemetry, booking management, manual assignment, technician vetting, pricing, reports, and audit logs |
| `@10min-help/customer-mobile` | `app/customer-mobile` | React Native, Expo SDK 51, Expo Router, TypeScript | Customer mobile app for breakdown booking, live radar tracking, quote approvals, vehicle garage, payments, and SOS |
| `@10min-help/mechanic-mobile` | `app/mechanic-mobile` | React Native, Expo SDK 51, Expo Router, TypeScript | Mechanic partner app for online/offline duty toggle, 15s incoming offer countdown, state-machine job execution, quote revisions, cash settlement, and earnings |

---

### 1.2 User-Facing Screens & Routes

#### Customer Website (`web/customer-web`)
- `/` (`src/app/page.tsx`) — Landing page with Bike/Car switcher, starting rates, and service catalogue
- `/login` (`src/app/login/page.tsx`) — Passwordless phone + 6-digit OTP sign-in/registration
- `/services` (`src/app/services/page.tsx`) — Full breakdown service catalogue and Bike vs. Car price comparison
- `/services/[service]` (`src/app/services/[service]/page.tsx`) — Individual service detail and scope page
- `/book` (`src/app/book/page.tsx`) — 4-step emergency assistance booking flow (Vehicle, Service, GPS Location, Notes)
- `/booking/[id]` (`src/app/booking/[id]/page.tsx`) — Live dispatch tracking, quote revision approval, payment, cancellation, and rating
- `/my-bookings` (`src/app/my-bookings/page.tsx`) — Customer booking history and status list
- `/profile` (`src/app/profile/page.tsx`) — Customer profile, emergency SOS contact, and saved vehicle garage
- `/how-it-works`, `/safety`, `/help`, `/terms`, `/privacy` — Operational transparency, safety protocols, FAQs, and legal policies

#### Admin & Dispatch Website (`web/admin-web`)
- `/login` (`src/app/login/page.tsx`) — Operations console authentication
- `/` (`src/app/page.tsx`) — Operational Command Center (10-min compliance, avg arrival, active jobs, financial KPIs)
- `/dispatch` (`src/app/dispatch/page.tsx`) — Live Dispatch Radar & Telemetry queue
- `/bookings` (`src/app/bookings/page.tsx`) — Searchable, filterable, paginated bookings table & manual dispatch assignment
- `/technicians` (`src/app/technicians/page.tsx`) — Technician verification queue (`PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED`)
- `/services` (`src/app/services/page.tsx`) — Dynamic service catalogue & Bike/Car starting price editor
- `/reports` (`src/app/reports/page.tsx`) — Operational SLA & revenue analytics with CSV export
- `/audit-logs` (`src/app/audit-logs/page.tsx`) — Immutable security & operational audit log viewer

#### Customer Mobile App (`app/customer-mobile`)
- `/(auth)/login` — Mobile OTP login and registration
- `/(tabs)/index` — Home screen with radar telemetry, Bike/Car toggle, SOS hotline, and service catalogue
- `/(tabs)/bookings` — Customer booking history list
- `/(tabs)/vehicles` — Customer saved vehicles garage (add/remove bikes & cars)
- `/(tabs)/profile` — Customer profile, emergency SOS contact management, and sign-out
- `/book` — Mobile emergency booking creation screen
- `/booking/[id]` — Live booking tracking, quote revision approval, UPI/Card payment, cancellation, and review screen

#### Mechanic Mobile App (`app/mechanic-mobile`)
- `/(auth)/login` — Partner mobile OTP login and registration
- `/(tabs)/index` — Shift console with online/offline toggle, verification status, 15s offer modal, active job banner, and daily earnings
- `/(tabs)/earnings` — Commission breakdown (85% net payout, 15% platform fee) and recent completed jobs
- `/(tabs)/profile` — Partner profile, skills, supported vehicles, service zones, and onboarding application
- `/jobs/[id]` — Active job execution stepper (`ASSIGNED` → `EN_ROUTE` → `ARRIVED` → `INSPECTING` → `AWAITING_CUSTOMER_APPROVAL` / `IN_PROGRESS` → `COMPLETED`), quote revision form, cash payment recording, and GPS navigation

---

### 1.3 Backend API Endpoints (`/api/v1`)

| Module | Method & Path | Auth / Role | Purpose |
|---|---|---|---|
| **Health** | `GET /health`, `GET /api/v1/health` | Public | Liveness and readiness check |
| **Auth** | `POST /auth/send-otp` | Public (rate-limited) | Generate & send 6-digit OTP for Customer/Technician/existing Admin |
| **Auth** | `POST /auth/verify-otp` | Public (attempt-limited) | Verify OTP, issue access & refresh tokens |
| **Auth** | `POST /auth/refresh` | Public (refresh token) | Rotate & issue new access/refresh token pair |
| **Auth** | `POST /auth/logout` | Authenticated | Revoke active refresh token session |
| **Auth** | `GET /auth/me` | Authenticated | Get current user profile and technician profile |
| **Auth** | `PATCH /auth/profile` | Authenticated | Update user name, email, and emergency SOS contact |
| **Auth** | `GET /auth/notifications` | Authenticated | List user notifications |
| **Auth** | `PATCH /auth/notifications/:id/read` | Authenticated | Mark notification as read |
| **Vehicles** | `GET /vehicles` | Authenticated | List saved vehicles for current user |
| **Vehicles** | `POST /vehicles` | Authenticated | Add a bike or car to customer garage |
| **Vehicles** | `GET /vehicles/:id` | Authenticated (Owner) | Get single vehicle by ID |
| **Vehicles** | `PATCH /vehicles/:id` | Authenticated (Owner) | Update vehicle details |
| **Vehicles** | `DELETE /vehicles/:id` | Authenticated (Owner) | Delete saved vehicle |
| **Services** | `GET /services` | Public | List active services (optional `?vehicleType=BIKE\|CAR`) |
| **Services** | `GET /services/quote` | Public | Calculate starting price & duration (`?serviceId=...&vehicleType=...`) |
| **Services** | `GET /services/:id` | Public | Get single service details |
| **Technicians** | `POST /technicians/applications` | Authenticated | Submit/update technician onboarding application (`PENDING` review) |
| **Technicians** | `GET /technicians/me` | `TECHNICIAN`, `ADMIN` | Get technician profile |
| **Technicians** | `PATCH /technicians/availability` | `TECHNICIAN` | Toggle online/offline status (requires `VERIFIED`) |
| **Technicians** | `POST /technicians/location` | `TECHNICIAN` | Update technician GeoJSON coordinates |
| **Technicians** | `GET /technicians/active-job` | `TECHNICIAN` | Retrieve currently assigned active booking |
| **Technicians** | `GET /technicians/earnings` | `TECHNICIAN` | Retrieve gross, commission (15%), and net (85%) earnings |
| **Bookings** | `POST /bookings` | Authenticated | Create booking and initiate 15s dispatch |
| **Bookings** | `GET /bookings` | Authenticated | List bookings for current customer |
| **Bookings** | `GET /bookings/:id` | Authenticated (Authorized) | Get booking details (Customer, Assigned Tech, or Admin/Dispatcher) |
| **Bookings** | `POST /bookings/:id/cancel` | Authenticated (Authorized) | Cancel booking with state-machine & ownership validation |
| **Bookings** | `POST /bookings/:id/retry-dispatch` | Authenticated (Authorized) | Re-initiate dispatch for `UNFULFILLED` booking |
| **Bookings** | `POST /bookings/:id/propose-quote` | `TECHNICIAN` (Assigned) | Propose revised quote during `INSPECTING` stage |
| **Bookings** | `POST /bookings/:id/respond-quote` | `CUSTOMER` (Owner) | Approve or reject revised quote (`AWAITING_CUSTOMER_APPROVAL`) |
| **Bookings** | `POST /bookings/:id/approve-quote` | `CUSTOMER` (Owner) | Alias for `respond-quote` |
| **Bookings** | `POST /bookings/:id/status` | `TECHNICIAN` (Assigned) | Advance job state (`EN_ROUTE`, `ARRIVED`, `INSPECTING`, `IN_PROGRESS`, `COMPLETED`) |
| **Dispatch** | `GET /dispatch/offers/pending` | `TECHNICIAN` | Retrieve active non-expired 15s offer for current technician |
| **Dispatch** | `POST /dispatch/offers/:offerId/accept` | `TECHNICIAN` | Atomically accept 15s dispatch offer |
| **Dispatch** | `POST /dispatch/offers/:offerId/reject` | `TECHNICIAN` | Reject offer and immediately advance dispatch to next candidate |
| **Tracking** | `POST /tracking/location` | `TECHNICIAN` | Update live GPS coordinates, compute ETA, broadcast to booking room |
| **Tracking** | `GET /tracking/bookings/:bookingId` | Authenticated (Authorized) | Get customer/technician locations and ETA for authorized participants |
| **Payments** | `POST /payments/orders` | Authenticated (Owner) | Create payment order for booking |
| **Payments** | `POST /payments/verify` | Authenticated (Owner) | Verify HMAC-SHA256 payment signature idempotently |
| **Payments** | `POST /payments/cash` | `TECHNICIAN` (Assigned) | Record on-site cash collection idempotently |
| **Payments** | `POST /payments/webhooks/razorpay` | Public (HMAC Verified) | Process Razorpay webhook events (`payment.captured`, `payment.failed`) |
| **Payments** | `GET /payments/bookings/:bookingId` | Authenticated (Authorized) | Retrieve payment record for booking |
| **Reviews** | `POST /reviews` | Authenticated (Owner) | Submit 1–5 star rating for completed booking |
| **Reviews** | `GET /reviews/bookings/:bookingId` | Optional Auth | Get review for a specific booking |
| **Reviews** | `GET /reviews/technicians/:technicianId` | Optional Auth | List reviews for a technician |
| **Admin** | `GET /admin/metrics`, `GET /admin/kpis` | `ADMIN`, `DISPATCHER` | Real database-aggregated operational & financial KPIs |
| **Admin** | `GET /admin/reports` | `ADMIN`, `DISPATCHER` | Detailed SLA compliance, offer acceptance, rating, and category breakdown |
| **Admin** | `GET /admin/live-map`, `GET /admin/radar` | `ADMIN`, `DISPATCHER` | Online technicians and active bookings telemetry |
| **Admin** | `GET /admin/bookings` | `ADMIN`, `DISPATCHER` | Paginated, filterable, searchable booking tickets |
| **Admin** | `POST /admin/bookings/:bookingId/assign` | `ADMIN`, `DISPATCHER` | Manual technician assignment override |
| **Admin** | `GET /admin/technicians` | `ADMIN`, `DISPATCHER` | List technicians with verification filter |
| **Admin** | `PATCH /admin/technicians/:id/verification` | `ADMIN`, `DISPATCHER` | Approve, reject, or suspend technician |
| **Admin** | `GET /admin/services` | `ADMIN`, `DISPATCHER` | List all services (including inactive) for admin management |
| **Admin** | `PATCH /admin/services/:id` | `ADMIN`, `DISPATCHER` | Update service starting prices and active status |
| **Admin** | `GET /admin/audit-logs` | `ADMIN`, `DISPATCHER` | Retrieve system audit trail |

---

### 1.4 Database Models (`backend/src/models`)
1. `UserModel` (`User.ts`) — Customer, Technician, Dispatcher, and Admin accounts, emergency contacts, and session token state.
2. `VehicleModel` (`Vehicle.ts`) — Customer bikes and cars (`owner` -> `User`).
3. `TechnicianModel` (`Technician.ts`) — Partner mechanics (`user` -> `User`, `activeBookingId` -> `Booking`, 2dsphere `currentLocation`).
4. `ServiceModel` (`Service.ts`) — 8 roadside service categories, Bike/Car starting prices, inclusions, active flags.
5. `ServiceAreaModel` (`ServiceArea.ts`) — Pilot city zones with 2dsphere `centerCoordinates` and `radiusKm`.
6. `BookingModel` (`Booking.ts`) — Core assistance lifecycle ticket (`customer` -> `User`, `service` -> `Service`, `technician` -> `Technician`, embedded `vehicle` snapshot, GeoJSON `pickupLocation`, `statusHistory`).
7. `DispatchOfferModel` (`DispatchOffer.ts`) — 15-second timed offers (`booking` -> `Booking`, `technician` -> `Technician`, `status`, `expiresAt`).
8. `PaymentModel` (`Payment.ts`) — Financial transactions (`booking` -> `Booking`, `customer` -> `User`, `providerOrderId`, `providerPaymentId`, `providerSignature`).
9. `ReviewModel` (`Review.ts`) — 1–5 star ratings (`booking` unique -> `Booking`, `customer` -> `User`, `technician` -> `Technician`).
10. `NotificationModel` (`Notification.ts`) — In-app notifications (`recipient` -> `User`).
11. `AuditLogModel` (`AuditLog.ts`) — Immutable operational and security audit log entries.

---

## 2. Audit Findings & Remediation Tracker

| ID | Priority | Severity | Area | Finding Summary | Affected Files | Status |
|---|---|---|---|---|---|---|
| **AUD-001** | P0 | Critical | Auth / RBAC | Public `/auth/send-otp` and `/auth/verify-otp` allow self-assigning `ADMIN` or `DISPATCHER` roles on new or existing phone numbers. | `packages/shared/src/schemas/index.ts`, `backend/src/modules/auth/auth.service.ts` | **FIXED & VERIFIED** |
| **AUD-002** | P0 | Critical | Auth / Vetting | New mechanics logging in via `/auth/verify-otp` are automatically created with `verificationStatus: VERIFIED` and `isOnline: true`, bypassing admin approval. | `backend/src/modules/auth/auth.service.ts` | **FIXED & VERIFIED** |
| **AUD-003** | P0 | High | Auth / Sessions | Raw OTPs logged to console; no OTP rate/attempt limits; deactivated users (`isActive: false`) allowed to log in; `/auth/logout` is a no-op; phone numbers not normalized (`+91` prefix mismatch). | `backend/src/modules/auth/*`, `backend/src/models/User.ts`, `backend/src/middleware/auth.ts` | **FIXED & VERIFIED** |
| **AUD-004** | P0 | Critical | Bookings / Tracking IDOR | `POST /bookings/:id/cancel` and `GET /tracking/bookings/:bookingId` lack resource ownership/authorization checks; any user can cancel or track any booking. | `backend/src/modules/bookings/bookings.service.ts`, `backend/src/modules/tracking/*` | **FIXED & VERIFIED** |
| **AUD-005** | P0 | Critical | Socket.IO Security | `join:booking` allows any socket to subscribe to `booking:<id>` without authorization check; unauthenticated sockets allowed in dev. | `backend/src/sockets/index.ts` | **FIXED & VERIFIED** |
| **AUD-006** | P0 | Critical | Payments Integrity | `verifyPayment` ignores `customerId` (IDOR), falls back to matching any `PENDING` payment when `providerOrderId` mismatches, lacks replay/idempotency checks; `GET /payments/bookings/:bookingId` lacks auth check; `recordCashPayment` lacks validation/idempotency; missing Razorpay webhook endpoint; non-timing-safe HMAC check. | `backend/src/modules/payments/*`, `backend/src/utils/crypto.ts` | **FIXED & VERIFIED** |
| **AUD-007** | P0 | High | Database Safety | `backend/src/seeds/index.ts` unconditionally wipes all collections (`deleteMany({})`) without production guard or non-destructive upsert default. | `backend/src/seeds/index.ts` | **FIXED & VERIFIED** |
| **AUD-008** | P1 | High | Dispatch Engine | `processExpiredOffers` uses non-atomic updates; `initiateDispatch` leaves booking stuck in `SEARCHING` when 0 candidates exist on round 1; `Technician` schema fabricates default coordinates; `acceptOffer` does not atomically claim the technician or offer; missing pending-offer recovery endpoint. | `backend/src/modules/dispatch/*`, `backend/src/models/Technician.ts` | **FIXED & VERIFIED** |
| **AUD-009** | P1 | High | Admin Backend | `getDashboardMetrics` fabricates `8.5` mins and `92%` when 0 jobs completed; `listBookings` ignores `search` query; `manualAssign` doesn't check busy status or expire pending offers; suspending a technician leaves `isOnline: true`; missing `/admin/reports` endpoint. | `backend/src/modules/admin/*` | **FIXED & VERIFIED** |
| **AUD-010** | P1 | Medium | Profile / Reviews / Notifications | Missing `PATCH /auth/profile` and `/auth/notifications` endpoints; `ReviewsService.createReview` uses non-atomic rating calculation. | `backend/src/modules/auth/*`, `backend/src/modules/reviews/reviews.service.ts` | **FIXED & VERIFIED** |
| **AUD-011** | P2 | High | Admin Web | `services/page.tsx` uses local constant and fake save button; `reports/page.tsx` uses hardcoded numbers and fake CSV alert; `bookings/page.tsx` lacks search, pagination, detail modal, and manual technician assignment; dashboard uses synthetic fallback numbers. | `web/admin-web/src/app/**/*`, `web/admin-web/src/lib/api.ts` | **FIXED & VERIFIED** |
| **AUD-012** | P2 | High | Customer Web | Home & Services pages don't fetch live admin-updated prices; `/book` ignores `?service=` and `?vehicle=` query params; `/booking/[id]` doesn't fetch existing review on load, uses `prompt()`/`alert()`, and lacks retry-dispatch / payment method choice; `/profile` lacks profile & emergency contact editing. | `web/customer-web/src/app/**/*`, `web/customer-web/src/lib/api.ts` | **FIXED & VERIFIED** |
| **AUD-013** | P2 | High | Mobile Apps | Customer & Mechanic mobile apps use in-memory-only tokens, hardcoded profile screens, hardcoded demo bike button, missing customer quote approval/cancellation/review UI in `customer-mobile/app/booking/[id].tsx`, and missing pending offer recovery, cash collection, onboarding application, and GeoJSON nav coordinates in `mechanic-mobile`. | `app/customer-mobile/**/*`, `app/mechanic-mobile/**/*` | **FIXED & VERIFIED** |
| **AUD-014** | P3/P4 | Medium | Testing & DevOps | Only 3 unit test files exist (no integration or E2E tests); `web/*` packages lack `typecheck` scripts; `db.ts` lacks embedded in-memory MongoDB fallback promised by `.env.example`. | `backend/tests/**/*`, `backend/src/config/db.ts`, `web/*/package.json`, `docs/engineering/*` | **FIXED & VERIFIED** |
