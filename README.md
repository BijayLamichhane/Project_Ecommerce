# RentHub — Modern Full-Stack Rental Marketplace

> **Rent what you need. Without buying what you don't.**

RentHub is a production-quality full-stack web application for renting physical products (cameras, laptops, camping gear, drones, instruments, and tools) for specific time periods.

---

## 🌟 Key Architectural Features

- **Availability & Conflict Engine**: Non-overlapping booking date enforcement using PostgreSQL transactional locks (`FOR UPDATE`) and Redis distributed locks.
- **Security Deposit Architecture**: Refundable security deposits tracked separately from rental revenue and released upon verified return.
- **Dynamic Tiered Pricing**: Hourly, daily, weekly, and monthly discount tier calculations computed strictly on the backend.
- **Real-Time Communication**: Socket.IO integration for buyer-seller messaging, typing indicators, and instant order notifications.
- **Role-Based Access Control**: RBAC for `customer`, `seller`, and `admin` roles.
- **Fast Redis Caching**: Product catalogs, categories, and rate-limiting.

---

## ✨ Recent Rental Experience Improvements

- **Rental Details messaging**: Customers can ask the seller a question directly from a booking. The question starts or reuses a messaging conversation and opens the Messages page after sending.
- **Booking history on Dashboard**: Previous completed, returned, cancelled, and rejected bookings are now visible from the customer dashboard and link directly to their rental details.
- **Rental review flow**: Reviews can be opened for returned or completed rentals, with the product ID resolved from the booking item when necessary.
- **Dark rental experience**: Dashboard and Rental Details use a dark interface with vivid cyan, violet, amber, and emerald accents for clearer status and action hierarchy.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons, Recharts |
| **Backend** | Node.js, Express.js, TypeScript, Better Auth, Socket.IO, Zod validation |
| **Database & ORM** | PostgreSQL 16, Drizzle ORM, Drizzle Kit |
| **Cache & Realtime** | Redis 7 (`ioredis`), Socket.IO |
| **Infrastructure** | Docker Compose (Postgres, Redis, Adminer) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Docker Desktop](https://www.docker.com/) (for PostgreSQL and Redis)

### 2. Clone & Setup Environment
```bash
# Copy example environment file
cp .env.example .env
```

### 3. Start Database & Redis Services
```bash
docker-compose up -d
```
This launches:
- **PostgreSQL**: `localhost:5432` (`renthub_db`)
- **Redis**: `localhost:6379`
- **Adminer DB UI**: `http://localhost:8080`

### 4. Install Dependencies
```bash
# In server directory
cd server
npm install

# In client directory (in another terminal or root)
cd ../client
npm install
```

### 5. Run Database Migrations & Realistic Seed Data
```bash
cd server
npm run db:generate
npm run db:migrate
npm run db:seed
```

The seed script loads:
- **10+ Categories**: Cameras, Laptops, Camping, Musical Instruments, Drones, Tools, VR, etc.
- **20+ Realistic Products**: With specifications, high-res photography, and multi-tier pricing.
- **5 Verified Lenders**: (e.g. Apex Cine Rentals, Himalayan Adventure Gear).
- **Pre-populated Rentals & Verified Reviews**.

### 6. Start Development Servers
```bash
# Start backend API (Port 5000)
cd server
npm run dev

# Start frontend UI (Port 3000)
cd client
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🔑 Pre-Configured Demo Accounts

For fast review and pair testing:

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `[EMAIL_ADDRESS]` | `admin123` | Full governance, moderation, dispute analytics |
| **Seller / Lender** | `[EMAIL_ADDRESS]` | `seller123` | Camera rental shop with live bookings & earnings |
| **Customer** | `[EMAIL_ADDRESS]` | `customer123` | Renter with active and past rentals |

---

## 🧪 Running Automated Tests
```bash
cd server
npm test
```
Runs unit and integration test suites:
- Price tier calculation algorithms
- Date overlap and booking conflict detection
- Booking state machine transition integrity

---

## 📁 Project Directory Structure

```text
E-commerce-Project/
├── docker-compose.yml          # PostgreSQL, Redis, Adminer containers
├── .env.example                # Environment variables template
├── server/                     # Modular Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # DB, Redis, Auth, Cloudinary, Env
│   │   ├── db/                 # Drizzle schema (20+ tables), migrations & seed
│   │   ├── middleware/         # Auth, RBAC guards, validation, error handler
│   │   ├── modules/            # Bookings, Products, Cart, Wishlist, Payments, Reviews, Users, Admin
│   │   ├── sockets/            # Socket.IO handlers
│   │   ├── utils/              # Pricing engine, availability conflict algorithms
│   │   ├── app.ts              # Express factory
│   │   └── server.ts           # Server entrypoint
│   └── package.json
│
├── client/                     # Feature-Based React + Vite Frontend
│   ├── src/
│   │   ├── app/                # Root App & React Router
│   │   ├── components/         # Layout (Navbar, Footer), ProductCard, RentalCalendar, PriceSummary
│   │   ├── hooks/              # useAuth, useSocket
│   │   ├── lib/                # Axios, TanStack queryClient, formatters
│   │   ├── pages/              # Home, Catalog, ProductDetail, Cart, Wishlist, Bookings, Messages, Seller, Admin
│   │   └── types/              # Domain TypeScript interfaces
│   └── package.json
```
