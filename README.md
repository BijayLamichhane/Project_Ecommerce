# RentHub — Modern Full-Stack Rental Marketplace

> **Rent what you need. Without buying what you don't.**

RentHub is a full-stack web application for renting physical products such as cameras, laptops, camping gear, drones, instruments, and tools for specific time periods.

---

## 🌟 Key Architectural Features

- **Availability & Conflict Engine**: Date-based availability keeps rented products listed while blocking only reserved dates. The product calendar loads each visible month, supports advance booking for future available dates, and uses an atomic per-product/day MongoDB inventory ledger to prevent concurrent overbooking without requiring Redis locks.
- **Security Deposit Architecture**: Refundable security deposits tracked separately from rental revenue and released upon verified return.
- **Dynamic Tiered Pricing**: Hourly, daily, weekly, and monthly pricing calculated on the backend.
- **Recommendation System**: Personalized customer recommendations use existing wishlist, rental history, category, brand, city, rating, and popularity signals, with a popular-products fallback for new customers. Product detail pages also show similar gear.
- **Real-Time Communication**: Socket.IO integration for customer-seller messaging, typing indicators, and instant notifications.
- **Role-Based Access Control**: RBAC for `customer`, `seller`, and `admin` roles.
- **Redis Caching & Rate Limiting**: Optional Redis support for product/category caching and rate limiting; booking concurrency is enforced by the MongoDB inventory ledger.
- **Server-Verified Payments**: eSewa checkout is verified server-side before a booking is confirmed.
- **Recommendation Architecture**: Recommendations are implemented as a dedicated module without adding an ML dependency or storing a separate tracking profile. Existing marketplace behavior is used as the signal source.
- **Admin Product Governance**: Administrators can search marketplace listings, filter by status or featured state, activate or suspend listings, and feature or unfeature active products from the admin panel. Featured changes are recorded in the admin audit log and reflected in homepage discovery.
- **Reports and Disputes**: Customers can report marketplace listings and booking participants can raise disputes with a reason. Administrators can filter and review report submissions, record reviewed, resolved, or dismissed outcomes, and resolve disputes by either completing the booking or dismissing the dispute and restoring its previous lifecycle state.
- **One Review Per Product**: Each customer can have only one review for a product. The existing review can be edited, while the database still enforces a unique `(productId, reviewerId)` index for concurrent requests.
- **Easy Payment Access**: Unpaid pending bookings are surfaced directly from the customer dashboard and navbar with Pay Now links, so customers do not need to return to the product page or search through booking history to continue payment.
- **Payment Cancellation**: Customers can cancel a pending payment from the booking detail page. The booking hold is cancelled, reserved dates are released, and the pending payment attempt is marked cancelled. A late gateway completion after cancellation is flagged for refund instead of confirming the cancelled booking.

---

## ✨ Recent Reliability & Security Improvements

- **Authentication compatibility**: Legacy bcrypt credentials from earlier application versions are migrated into Better Auth credential accounts automatically during server startup.
- **Legacy authentication cleanup**: Passwords migrated from the older user collection are removed from the legacy user record after the Better Auth credential account is created.
- **Session normalization**: Login and registration fetch the canonical `/users/me` profile after Better Auth creates the session, keeping application roles and profile fields consistent.
- **Origin protection**: Better Auth and Socket.IO trust only configured frontend origins.
- **WebSocket authentication**: Socket connections derive the user identity from the Better Auth session instead of accepting a client-supplied user ID.
- **Conversation authorization**: Users can only read, join, or send messages in conversations where they are actual participants.
- **Password protection**: The application user model no longer exposes or returns stored password hashes.
- **Production secret checks**: The server refuses to start in production when development authentication/payment secrets are still being used.
- **Request rate limiting**: General API traffic is rate-limited from a single global middleware, while credential login/registration uses a stricter 20-requests-per-15-minutes budget. Redis is used when enabled, with an in-memory fallback otherwise. The session bootstrap request used by the frontend is excluded from this general limiter to avoid blocking authentication state initialization, and the frontend does not retry HTTP 429 responses automatically.
- **Upload content validation**: Product image uploads validate file signatures (magic bytes) in addition to the declared MIME type before storage.
- **HTTP authorization tests**: Express routes are covered by integration-style tests for booking ownership, product ownership, admin RBAC, and role-specific booking transitions.
- **Seller payout choices**: Seller onboarding supports a bank account or debit/credit card demo payout profile. Only masked card details are stored; full card numbers and CVV are never persisted.
- **Warm gear-check UI**: The application uses a paper/canvas visual system with ink, stone, brass, moss, and rust accents, flat surfaces, compact controls, and equipment-tag-inspired details.
- **Seller product isolation**: Seller dashboards load only products owned by the authenticated seller through a protected `/products/mine` endpoint; public product search remains available for marketplace browsing.
- **Seller listing controls**: Sellers can search their catalog, filter listings by lifecycle state, pause or reactivate their own active/draft listings without deleting them, and view existing view, rental, and rating metrics.
- **Seller booking operations**: Seller bookings can be searched and filtered by lifecycle status, while existing role-protected actions remain available for handover, return, completion, or declining unpaid requests.
- **Seller product deletion**: Sellers can delete their own listings from the dashboard. Deletion uses the existing authorization-protected product delete operation and removes the listing from seller inventory/search results without allowing sellers to delete another seller's product.
- **Seller application approval**: Customers submit seller applications while remaining `customer` accounts. An administrator reviews pending applications and must approve one before the account becomes a `seller`.
- **Seller application rejection reasons**: Administrators must provide a reason when rejecting a seller application. The rejection reason is stored on the seller profile and shown to the customer so they can understand what needs to be addressed before reapplying.
- **Direct seller disbandment**: Active sellers can disband their seller role without admin approval, provided they have no unresolved pending, confirmed, active, or return-requested rentals. Disbanding immediately returns the account to `customer` and takes active/draft seller listings offline.
- **Suspended account enforcement**: Administrators can suspend users, and suspended accounts are blocked from authenticated actions such as becoming a seller, purchasing/renting, managing listings, messaging, reviews, and other protected API operations. Suspended WebSocket connections are also blocked from joining conversations or sending/typing messages, and the client redirects them to a dedicated suspension screen.
- **Payment-driven booking holds**: New bookings create a short-lived pending hold (`PENDING_BOOKING_TTL_MINUTES`, default 20 minutes). Successful payment confirms the booking; expiry or seller decline releases the hold and preserves the booking history as a terminal `expired`/`rejected` record. Legacy pending bookings receive an expiry during server startup migration, and the booking inventory ledger reconciles existing live bookings at startup before new requests are accepted.

### Payment Environment

The server includes eSewa UAT defaults for development. For production, set the merchant values explicitly in `.env`:

```env
ESEWA_PRODUCT_CODE=your_merchant_product_code
ESEWA_SECRET_KEY=your_merchant_secret_key
ESEWA_CHECKOUT_URL=https://epay.esewa.com.np/api/epay/main/v2/form
ESEWA_STATUS_URL=https://epay.esewa.com.np/api/epay/transaction/status/
```

Never use UAT credentials in production. Payment confirmation is intentionally performed on the server instead of trusting a frontend success state.

### Seller Demo Card

For local/university demonstrations, seller onboarding includes a **Fill Demo Card** action using:

```text
Card:   4242 4242 4242 4242
Expiry: 12/30
CVV:    123
```

This is a demo payout profile only; it is not a real card-processing integration.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons |
| **Backend** | Node.js, Express.js, Better Auth, Socket.IO, Zod validation |
| **Database** | MongoDB, Mongoose |
| **Cache & Realtime** | Redis (`ioredis`), Socket.IO |
| **Infrastructure** | Optional Docker / local MongoDB and Redis |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- MongoDB
- Redis (optional; the application can run with Redis disabled)

### 2. Clone & Setup Environment
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
# Server
cd server
npm install

# Client, in another terminal
cd ../client
npm install
```

### 4. Start Development Servers
```bash
# Backend API
cd server
npm run dev

# Frontend
cd client
npm run dev
```

The default development URLs are **`http://localhost:5000`** for the API and **`http://localhost:3000`** for the client.

---

## 🧪 Running Automated Tests
```bash
cd server
npm test
```

The test suite covers core pricing, booking conflict and expiry behavior, booking state-machine transitions, late-payment resurrection/refund handling, recommendation ranking and fallbacks, HTTP authorization boundaries including admin product governance, return-condition validation, and upload signature detection.

---

## 📁 Project Structure

```text
Project_Ecommerce/
├── server/
│   ├── src/
│   │   ├── config/             # Auth, MongoDB, Redis, Cloudinary, environment
│   │   ├── middleware/         # Authentication, RBAC, validation, errors, uploads
│   │   ├── models/             # Mongoose domain models
│   │   ├── modules/            # Users, Products, Bookings, Payments, Reviews, Messaging, etc.
│   │   ├── sockets/             # Authenticated Socket.IO handlers
│   │   └── utils/              # Pricing, availability, logging and response helpers
│   └── package.json
└── client/
    ├── src/
    │   ├── app/                # Application and routes
    │   ├── components/         # Shared and layout components
    │   ├── hooks/              # Authentication and socket hooks
    │   ├── lib/                # Axios, React Query, utilities
    │   └── pages/              # Marketplace, customer, seller and admin pages
    └── package.json
```

## Documentation

Detailed architecture, feature behavior, API boundaries, recommendation logic, booking flow, and the latest maintenance audit are documented in [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md).
