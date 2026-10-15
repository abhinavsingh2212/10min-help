# 10Min Help — Emergency Roadside Vehicle Assistance Platform

> **"We reach. You relax."**  
> On-demand roadside emergency assistance platform for **Motorcycles, Scooters, and Cars** in India.

---

## 1. Product Overview

**10Min Help** is a full-stack, production-oriented roadside vehicle emergency platform connecting stranded motorists with nearby verified mechanics within a **10-minute operational service target**.

The monorepo encompasses four user-facing applications powered by a single unified Node.js/TypeScript backend, shared business logic, database models, and real-time Socket.IO telemetry:

1. **Customer Mobile Application** (`app/customer-mobile`): React Native Expo app with GPS pinpointing, vehicle garage, live dispatch radar, mechanic tracking, quote approvals, and digital payments.
2. **Mechanic Partner Application** (`app/mechanic-mobile`): React Native Expo app with duty toggle (online/offline), incoming job requests with a **strict 15-second countdown offer window**, state-machine-enforced job progression, and earnings analytics.
3. **Customer Responsive Web Portal** (`web/customer-web`): Next.js App Router portal with full service catalogue, bike vs. car transparent pricing tables, instant emergency dispatch, and live tracking.
4. **Admin & Dispatch Console** (`web/admin-web`): Next.js App Router operations dashboard with real database-calculated KPIs (10-minute arrival compliance %, gross revenue, mechanic liabilities), live telemetry radar, ticket management, technician vetting, and dynamic pricing controls.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Backend Engine** | Node.js, Express, TypeScript, REST API (`/api/v1`), Socket.IO, Winston Logger, Mongoose |
| **Persistence** | MongoDB Atlas / Local MongoDB with 2dsphere geospatial indexing |
| **Shared Domain** | `@10min-help/shared` (Enums, Types, Zod validation schemas, Canonical State Machine) |
| **Web Applications** | Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons, Socket.IO Client |
| **Mobile Applications** | React Native, Expo SDK 51, Expo Router, TypeScript, Socket.IO Client |
| **Testing** | Jest, ts-jest, Supertest |
| **Payment Gateway** | Razorpay / Indian Payment Gateway Adapter with HMAC-SHA256 signature verification & Sandbox mode |
| **Maps & Routing** | Haversine distance engine, urban road ETA calculator, mock/provider adapters |

---

## 3. Canonical Booking State Machine

All applications strictly adhere to the backend-enforced state machine:

```
REQUESTED
   │
   ▼
SEARCHING ────────► UNFULFILLED (No mechanics available after retries)
   │
   ▼ (Mechanic accepts 15s offer)
ASSIGNED
   │
   ▼
EN_ROUTE
   │
   ▼
ARRIVED
   │
   ▼
INSPECTING ───────► AWAITING_CUSTOMER_APPROVAL (If parts / extra work needed)
   │                       │
   │ (Standard price)      ▼ (Customer approves)
   └────────────────► IN_PROGRESS
                           │
                           ▼
                       COMPLETED
```

*Note: Cancellation is permitted from early stages according to policy. Invalid transitions (e.g. skipping from `REQUESTED` to `COMPLETED`) are rejected server-side.*

---

## 4. Automatic Dispatch Engine (15-Second Offer Window)

1. **Validation**: Validates customer location, vehicle type, and base starting quote.
2. **Geospatial Discovery**: Queries verified, online, idle technicians within the 10 km service radius supporting the vehicle and service skill.
3. **Candidate Ranking**: Scores technicians using road distance, estimated ETA, and past customer ratings.
4. **Timed Offer Window**: Dispatches a durable `DispatchOffer` to the top candidate with an exact **15-second countdown timer**.
5. **Atomic Assignment**: The first technician to accept claims the booking atomically via MongoDB `findOneAndUpdate({ status: 'SEARCHING' })`, guaranteeing no double bookings.
6. **Automatic Fallback**: If rejected or the 15 seconds expire without response, the background job immediately contacts the next candidate.

---

## 5. Standard Service Catalogue & Starting Rates

| Service Category | Two-Wheeler (Bike/Scooter) | Four-Wheeler (Car) | Typical Inclusions |
|---|---:|---:|---|
| **Puncture Repair** | ₹120 | ₹200 | Up to 2 punctures fixed, pressure check |
| **Battery Jump Start** | ₹150 | ₹250 | Heavy-duty cables, alternator check |
| **Vehicle Not Starting** | ₹200 | ₹200 | Spark plug, ignition, fuse box check |
| **Emergency Fuel Delivery** | ₹150 | ₹150 | 2–5 litres transport in safety cans |
| **Key Lockout Assistance** | ₹200 | ₹200 | Specialized non-destructive tools |
| **Minor On-Road Repair** | ₹250 | ₹250 | Clutch wire, brake fluid, chain tightening |
| **Tyre Change / Stepney** | ₹150 | ₹150 | Hydraulic jack lifting, spare fitting |
| **Long-Distance Towing** | ₹999 | ₹999 | Flatbed or wheel-lift, first 5 km included |

*Prices are configurable dynamically by administrators in `web/admin-web/src/app/services`.*

---

## 6. Monorepo Structure

```
10Min_Help/
├── app/
│   ├── customer-mobile/      # Expo React Native customer application
│   └── mechanic-mobile/      # Expo React Native partner technician application
├── web/
│   ├── customer-web/         # Next.js customer booking portal (port 3000)
│   └── admin-web/            # Next.js operations & dispatch console (port 3001)
├── backend/
│   ├── src/
│   │   ├── config/           # Environment, logger, and database config
│   │   ├── middleware/       # Auth, RBAC, Zod validation, error handler
│   │   ├── models/           # Mongoose schemas (User, Booking, Technician, etc.)
│   │   ├── modules/          # Auth, Bookings, Dispatch, Tracking, Payments, Reviews, Admin
│   │   ├── sockets/          # Socket.IO room hub
│   │   ├── jobs/             # 15s offer expiration runner
│   │   ├── seeds/            # Demo database seed script
│   │   ├── app.ts            # Express app bootstrap
│   │   └── server.ts         # Server entry point (port 5001)
│   └── tests/                # Automated unit & integration tests
├── packages/
│   └── shared/               # Enums, types, schemas, state machine
├── docs/                     # API reference & deployment specifications
├── .env.example              # Environment variables template
├── package.json              # Monorepo workspaces definition
└── README.md
```

---

## 7. Quickstart Guide

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB instance (local or MongoDB Atlas connection URI)

### Setup Instructions

1. **Clone & Configure Environment**:
   ```bash
   cp .env.example .env
   ```

2. **Install Workspace Dependencies**:
   ```bash
   npm install
   ```

3. **Build Shared Domain Package**:
   ```bash
   npm run build:shared
   ```

4. **Seed Demo Data**:
   ```bash
   npm run seed
   ```

5. **Start Applications**:
   - Backend API & WebSockets:
     ```bash
     npm run dev:backend       # http://localhost:5001
     ```
   - Customer Web Portal:
     ```bash
     npm run dev:customer-web  # http://localhost:3000
     ```
   - Admin Operations Console:
     ```bash
     npm run dev:admin-web     # http://localhost:3001
     ```
   - Customer Mobile App:
     ```bash
     npm run dev:customer-mobile
     ```
   - Mechanic Mobile App:
     ```bash
     npm run dev:mechanic-mobile
     ```

---

## 8. Demo Credentials for Testing

All test accounts use the development OTP code: **`123456`**.

| Role | Name | Phone Number | Profile Context |
|---|---|---|---|
| **Admin** | Admin Supervisor | `9999999999` | Full operational console access |
| **Customer** | Rahul Sharma | `9876543210` | Saved Royal Enfield & Creta, Indiranagar |
| **Mechanic 1** | Suresh Kumar | `9876500001` | Verified, Online, Indiranagar (4.9★, 142 jobs) |
| **Mechanic 2** | Ramesh Verma | `9876500002` | Verified, Online, Koramangala (4.8★, 96 jobs) |
| **Mechanic 3** | Vikram Singh | `9876500003` | Pending Admin Verification Review Queue |

---

## 9. Running Automated Tests

Run backend unit tests for pricing, state machine, dispatch ranking, and HMAC cryptographic payments:
```bash
npm test
```

---

## 10. Customer Safety & Privacy Principles

- **Verified Identity**: Technicians must be vetted by administrators before receiving live customer dispatches.
- **One-Click SOS Sharing**: Allows customers to share live tracking links with emergency contacts.
- **Data Minimization**: GPS tracking coordinates are broadcasted strictly while an active assistance job is underway and terminated upon completion.
- **Zero Client Trust**: All pricing, state transitions, and payment authorizations are verified server-side.
