# RentHub — Modern Full-Stack Rental Marketplace

> **Rent what you need. Without buying what you don't.**

RentHub is a full-stack web application for renting physical products such as cameras, laptops, camping gear, drones, instruments, and tools for specific time periods.

---

## 🌟 Key Architectural Features

- **Availability & Conflict Engine**: Non-overlapping booking date enforcement with MongoDB availability checks and optional Redis distributed locks.
- **Security Deposit Architecture**: Refundable security deposits tracked separately from rental revenue and released upon verified return.
- **Dynamic Tiered Pricing**: Hourly, daily, weekly, and monthly pricing calculated on the backend.
- **Real-Time Communication**: Socket.IO integration for customer-seller messaging, typing indicators, and instant notifications.
- **Role-Based Access Control**: RBAC for `customer`, `seller`, and `admin` roles.
- **Redis Caching & Locking**: Optional Redis support for caching, booking locks, and rate limiting.
- **Server-Verified Payments**: eSewa checkout is verified server-side before a booking is confirmed.

---

## ✨ Recent Reliability & Security Improvements

- **Authentication compatibility**: Existing seeded bcrypt credentials are migrated into Better Auth credential accounts automatically during server startup.
- **Session normalization**: Login and registration fetch the canonical `/users/me` profile after Better Auth creates the session, keeping application roles and profile fields consistent.
- **Origin protection**: Better Auth and Socket.IO trust only configured frontend origins.
- **WebSocket authentication**: Socket connections derive the user identity from the Better Auth session instead of accepting a client-supplied user ID.
- **Conversation authorization**: Users can only read, join, or send messages in conversations where they are actual participants.
- **Password protection**: The application user model no longer exposes or returns stored password hashes.
- **Production secret checks**: The server refuses to start in production when development authentication/payment secrets are still being used.
- **Seller payout choices**: Seller onboarding supports a bank account or debit/credit card demo payout profile. Only masked card details are stored; full card numbers and CVV are never persisted.
- **Dark application theme**: The UI uses dark surfaces with vivid cyan, violet, amber, and emerald accents, including legacy components that still use older light utility classes.
- **Seller product isolation**: Seller dashboards load only products owned by the authenticated seller through a protected `/products/mine` endpoint; public product search remains available for marketplace browsing.
- **Seller product deletion**: Sellers can delete their own listings from the dashboard. Deletion uses the existing authorization-protected product delete operation and removes the listing from seller inventory/search results without allowing sellers to delete another seller's product.
- **Seller disband approval workflow**: Sellers can request to leave the seller role, but the role is not removed by the seller themselves. The request must be approved by an admin. Requests are blocked while the seller has unresolved pending, confirmed, active, or return-requested rentals; an approved disband returns the account to `customer` and takes active/draft seller listings offline.

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
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons, Recharts |
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

### 4. Seed Realistic Demo Data
```bash
cd server
npm run db:seed
```

The seed script creates demo users, verified sellers, categories, products, bookings, reviews, and notifications.

### 5. Start Development Servers
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

## 🔑 Pre-Configured Demo Accounts

All seeded demo accounts use the same password:

```text
Password123!
```

| Role | Email | Details |
|---|---|---|
| **Admin** | `admin@renthub.app` | Governance, moderation, analytics |
| **Seller / Lender** | `apex.rentals@renthub.app` | Camera rental shop, bookings and earnings |
| **Customer** | `prashant@example.com` | Customer account with active and past rentals |

The server automatically migrates seeded legacy bcrypt passwords into Better Auth credential accounts when required.

---

## 🧪 Running Automated Tests
```bash
cd server
npm test
```

The test suite covers core pricing, booking conflict, and booking state-machine behavior.

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
