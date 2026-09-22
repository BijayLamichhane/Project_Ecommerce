# RentHub Project Documentation

## 1. Project Overview

RentHub is a full-stack rental marketplace for physical equipment. Customers can discover products, check rental availability, place short-lived booking holds, complete payment, manage rentals, request returns, communicate with sellers, save products to a wishlist, and submit reviews. Sellers can list equipment, manage pricing and availability, manage rentals, and maintain payout information. Administrators manage users, seller applications, products, reports, disputes, and marketplace governance.

The application is implemented as a modular marketplace rather than a simple product catalog. Booking, payment, availability, messaging, notifications, reviews, and seller workflows are separate domain areas connected through service and repository layers.

## 2. Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Node.js, Express.js, Better Auth, Zod |
| Database | MongoDB with Mongoose |
| Payments | eSewa checkout verification and development card flow |
| Realtime | Socket.IO |
| Cache | Optional Redis |
| Storage | Cloudinary with local upload fallback |
| Testing | Vitest |
| Infrastructure | Docker Compose for local MongoDB and optional Redis |

## 3. Architectural Structure

The backend follows a modular route, controller, service, and repository structure.

Routes define HTTP boundaries and authentication requirements. Controllers translate HTTP requests into service calls. Services contain business rules and orchestration. Repositories contain database access and query logic. Models define MongoDB persistence.

The frontend uses page-level features, shared components, React Query for server state, Axios for HTTP requests, and Socket.IO for selected realtime updates.

The booking availability workflow deliberately does not depend on Redis locking. The current local MongoDB setup is a standalone deployment, so concurrent inventory reservation uses an atomic per-product/day inventory ledger.

## 4. Core Marketplace Features

### Authentication and authorization

Better Auth handles sessions and credential authentication. Application roles are customer, seller, and admin. Protected routes use authenticated session identity and role checks.

### Product marketplace

Customers can search and filter rental products by query, category, price, city, condition, rating, and sort order. Products contain pricing, rental rules, images, seller information, and quantity.

### Wishlist

Customers can add or remove products from a wishlist. Existing wishlist data is also used as one of the recommendation signals.

### Cart

Customers can hold selected rental details in a cart before creating a booking. Cart pricing is calculated from the same backend rental pricing utility used by direct booking.

### Reviews

A customer may have only one review for a product. The service performs an application-level duplicate check, while MongoDB enforces a unique `(productId, reviewerId)` compound index so concurrent requests cannot create a second review for the same customer and product. The existing review remains editable through the product detail page or the completed/returned booking detail page. Editing is restricted to the review owner and updates the existing record rather than creating another review.

### Booking and availability

New bookings are created as pending payment holds. A pending hold expires after PENDING_BOOKING_TTL_MINUTES, which defaults to 20 minutes. Expired holds are retained as booking history rather than deleted.

Availability treats these states as inventory blocking:

- pending bookings whose expiresAt is still in the future
- confirmed bookings
- active bookings
- return-requested bookings

Expired, rejected, and cancelled bookings release inventory.

A BookingInventory ledger stores reservations by product and UTC day. Reservation creation uses an atomic MongoDB update so two concurrent requests cannot reserve beyond the product quantity.

The server performs startup reconciliation and periodically expires stale pending bookings. Individual booking reads also self-heal expired pending records.

### Payment access

A pending booking can be paid directly from the customer dashboard and from the navbar. The dashboard shows a Payment Required section with a Pay Now link for each active pending hold. The desktop navbar shows a payment badge and dropdown with direct links to each pending booking, while mobile navigation exposes the payment due count and a direct Pay Now link. This keeps payment accessible even after the customer has left the original product page and avoids requiring a trip through booking history.

### Payment flow

The payment flow is payment driven.

A customer creates a pending booking and is given a limited payment window. Successful server-verified payment changes the booking to confirmed. The seller does not manually accept a payment-pending booking.

If an eSewa success callback arrives after the pending hold expired, the backend checks whether the exact dates can still be reserved. If they can, the booking is resurrected and confirmed. If they cannot, the payment is marked for manual refund handling instead of silently confirming an unavailable rental.

### Realtime availability

Product detail pages join a product-specific Socket.IO room. Booking creation, decline, cancellation, and expiry emit availability_changed, causing the affected availability calendar query to refresh without a full page reload.

### Notifications

Booking expiry, booking decline, and successful payment generate persisted notifications where applicable. Socket.IO is used to deliver supported notification events immediately.

### Returns

Customers can submit return requests for active bookings. The current frontend supports return condition and notes. The backend validates the condition values and transitions the booking into return_requested.

## 5. Recommendation System

RentHub now contains a real recommendation system. The previous dashboard section labeled Recommended Gear For You was using the featured-products endpoint, which was not a personalized recommendation system. It now uses a dedicated recommendation module.

### Recommendation approach

The implementation is a lightweight hybrid content and behavior based recommender. It does not require an external machine learning service and does not introduce a separate recommendation database.

Customer signals come from existing marketplace data:

- rental history
- wishlist products
- product category
- product brand
- product city

Candidate quality is further influenced by:

- average rating
- total rental count
- featured status
- product attributes such as category, brand, city, condition, and daily price for similar-product ranking

The system excludes products already present in the customer's recent wishlist or rental history when generating personalized recommendations.

### Personalized recommendations

Endpoint:

GET /api/v1/recommendations/personalized?limit=4

The endpoint requires authentication.

The service builds preference weights from existing wishlist and rental activity, retrieves active candidate products matching those preferences, scores the candidates, and returns the highest scoring products.

Customers without useful history receive a popularity based fallback instead of an empty recommendation area.

### Similar-product recommendations

Endpoint:

GET /api/v1/recommendations/similar/:productId?limit=4

This endpoint is public.

The service compares products using the current product's category, brand, city, condition, daily price, rating, and rental popularity. Same-category products are considered first, with a broader active-product fallback when the category has too few candidates.

### Frontend placement

Personalized recommendations are displayed on the customer dashboard.

Similar products are displayed on the product detail page under the listing and review content.

The recommendation UI uses the same ProductCard component as the normal marketplace, keeping presentation consistent.

## 6. Recommendation Module Structure

The server module is organized as follows:

server/src/modules/recommendations/
recommendation.controller.js
recommendation.repository.js
recommendation.routes.js
recommendation.service.js
recommendation.service.test.js

The module is mounted under /api/v1/recommendations.

No new runtime dependency was introduced.

## 7. Availability and Payment Data Integrity

The booking system avoids relying on delayed background cleanup alone.

Three mechanisms work together:

1. periodic expiry sweep
2. lazy expiry when a booking is read
3. expiry-aware availability queries

The inventory ledger is kept separately from the historical booking document so historical records can remain intact while reservations are released.

Startup reconciliation rebuilds missing or stale ledger reservations from live booking records.

## 8. Maintenance Audit and Cleanup

A repository usage audit was performed before adding new functionality. Only code that was verified to have no caller in the current codebase was removed.

Removed items:

- unused CacheKeys.productList
- unused CacheKeys.category
- unused CacheKeys.sellerProfile
- unused CacheTTL.productList
- unused CacheTTL.seller
- unused CategoryRepository.findRootCategories
- unused ProductRepository.upsertPricing
- unused ProductRepository.upsertRules
- unused local isAvailable variable in the cart service
- stale test mocks for the removed product repository methods

The core Redis product and category list cache entries that are still used were kept.

Marketplace modules such as cart, wishlist, messaging, notifications, reviews, payments, users, products, bookings, and administration remain because they are actively connected to routes or other services.

## 9. Testing

The server test command is:

    cd server
    npm test

Recommendation-specific tests verify:

- personalized ranking uses customer signals
- customers without history receive a popularity fallback
- similar products are ranked using relevant product attributes
- scoring works without introducing new tracking data

Booking tests cover expiry transitions, live pending availability behavior, and late payment handling.

Authorization tests cover booking ownership, seller product ownership, admin boundaries, and protected booking transitions.

## 10. Important Environment Settings

The payment hold duration is controlled by:

    PENDING_BOOKING_TTL_MINUTES=20

Redis remains optional:

    REDIS_ENABLED=false

The application does not use Redis for booking concurrency.

## 11. Development URLs

Frontend: http://localhost:3000

Backend: http://localhost:5000

API base path: /api/v1

## 12. Operational Notes

Recommendation quality improves naturally as customers use the marketplace because the system uses existing wishlist and rental history as signals. It does not require a separate event tracking pipeline for the current project scope.

The recommendation algorithm is intentionally deterministic and explainable. It can be extended later with click history, search history, collaborative filtering, or a machine learning model without changing the frontend recommendation component contract.

The current recommendation system should be considered a practical marketplace recommender rather than a machine-learning recommendation engine.

## 13. Current Project Status

The repository currently contains the booking hold and payment reliability flow, real personalized and similar-product recommendations, realtime product availability updates, role-based marketplace workflows, and automated tests for the main business rules.

Changes should continue to preserve the existing modular architecture and avoid introducing new services when existing domain boundaries are sufficient.
