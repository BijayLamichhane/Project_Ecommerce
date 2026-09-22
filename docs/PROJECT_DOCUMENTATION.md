# RentHub Project Documentation

## 1. Project Overview

RentHub is a full stack rental marketplace for physical products. The application is designed around the idea that customers can rent useful equipment for a defined period instead of purchasing it outright.

The marketplace supports products such as cameras, laptops, camping equipment, drones, musical instruments and tools. A customer can browse available products, check rental availability, calculate the expected price, create a booking, complete payment, communicate with the seller and manage the return process.

The platform also supports sellers who want to list rental products and manage their inventory and bookings. Administrators have access to marketplace management functions including seller approval, user suspension, product moderation, reports and dispute information.

The project is implemented as a separate React client and Express server. MongoDB is the primary application database. Redis can be enabled for caching and rate limiting, while Socket.IO provides real time communication.

This document describes the current repository structure, system behavior, local setup, configuration, security model, testing approach and operational considerations.

## 2. Main Objectives

The project has the following objectives.

1. Provide a simple marketplace for renting physical products.
2. Allow customers to search and compare rental products.
3. Calculate rental prices using hourly, daily, weekly and monthly pricing.
4. Prevent overlapping bookings through server side availability checks and an inventory ledger.
5. Support secure user authentication and role based authorization.
6. Give sellers tools for product and booking management.
7. Provide server verified payment processing through eSewa.
8. Keep security deposits separate from rental revenue and support deposit release or deduction.
9. Provide customer and seller messaging through Socket.IO.
10. Give administrators control over users, sellers, products and marketplace reports.

## 3. Technology Stack

### Frontend

The client is built with React 18 and TypeScript. Vite is used as the development and build tool. React Router handles application navigation.

TanStack Query is used for server state and API data management. Axios provides HTTP communication with the backend. React Hook Form and Zod are used for form handling and validation. Zustand provides client side state where required. Tailwind CSS is used for the user interface and Lucide React provides the interface icons.

### Backend

The server runs on Node.js with Express. Better Auth provides authentication and session handling. Mongoose provides the MongoDB data layer.

Zod is used for request validation. Socket.IO handles real time messaging. Multer handles product image uploads. Cloudinary is available for image storage. Nodemailer provides email related infrastructure. Helmet, CORS, compression and express rate limiting are used as part of the HTTP middleware layer.

### Database and Infrastructure

MongoDB is the primary application database.

Redis is optional. When enabled, it can support caching and distributed rate limiting. The booking concurrency model does not depend on Redis locks. Booking inventory is maintained through MongoDB.

Docker Compose is included for local infrastructure. The current compose file contains MongoDB and Redis services required by the application, as well as PostgreSQL and Adminer services retained for additional local use. The current application code does not use PostgreSQL for its main data access or authentication flow.

## 4. Application Architecture

RentHub uses a client server architecture.

The React client communicates with the Express API through HTTP requests. Authentication is handled through Better Auth sessions. Protected API requests are checked by authentication and authorization middleware before business logic is executed.

The server is organized into modules. Each major business area has its own routes, controllers, services, repositories and validation schemas where appropriate.

The general request flow is:

Client interface

React application

HTTP request

Express application

Authentication and authorization middleware

Request validation

Module route

Controller

Service

Repository or model

MongoDB

The server also exposes a Socket.IO connection for authenticated real time communication.

## 5. Core Application Areas

### Customer Marketplace

Customers can browse the marketplace, search products, open product details, check availability and view rental price estimates.

The customer experience also includes a cart, wishlist, bookings, reviews, notifications and direct communication with sellers.

### Seller Management

A normal customer account can apply to become a seller. Seller applications are reviewed by an administrator before the account receives seller permissions.

Approved sellers can create rental listings, upload product images, update their own listings, delete their listings and view seller specific bookings and earnings.

Seller product access is restricted to products owned by the authenticated seller.

### Booking Management

A booking contains the selected product, rental period, pricing information, deposit information and booking state.

New bookings create a temporary pending hold. The default pending hold period is 20 minutes. A successful payment confirms the booking. Expired or rejected pending bookings remain in history with their final state while their inventory hold is released.

The application uses a MongoDB inventory ledger to reduce the risk of concurrent overbooking.

### Payments

Payment processing is separated from booking creation. The server verifies payment before a booking becomes confirmed.

eSewa is supported for development and demonstration. Production deployments must use production merchant credentials and production endpoints.

The project also contains configuration placeholders for a future debit and credit card gateway. Card gateway integration is disabled by default.

### Security Deposits

Security deposits are treated separately from rental revenue.

After a successful return, the deposit can be released. If an approved deduction is required, the server can record the deduction against the deposit.

The seller payout profile stores only masked card information when the demonstration card option is used. Full card numbers and CVV values are not persisted.

### Messaging

Customers and sellers can communicate through conversations associated with products or bookings.

Socket.IO provides real time message delivery, typing indicators and notifications. WebSocket identity is derived from the authenticated Better Auth session rather than from a client supplied user identifier.

Conversation access is restricted to actual participants.

### Reviews

Customers can submit product reviews and sellers can reply to reviews. Product and seller review lists are publicly readable through the review endpoints, while creating a review requires authentication.

### Notifications

The notification module stores user notifications and provides endpoints for reading individual notifications or marking all notifications as read.

### Administration

The administrator dashboard provides marketplace level management.

Administrators can inspect users and sellers, suspend and unsuspend users, moderate seller applications, change product moderation status and access reports and disputes.

## 6. User Roles

The application currently uses three primary roles.

### Customer

Customers can browse the marketplace, manage their profile, create bookings, make payments, manage their cart and wishlist, send messages, submit reviews and request seller onboarding.

### Seller

Sellers have the customer capabilities plus seller specific permissions. They can create and manage their own rental listings, upload product images, view seller bookings, manage seller settings and review earnings.

Seller access is subject to the seller approval process.

### Administrator

Administrators have marketplace management permissions. They can manage categories, moderate sellers, suspend users, moderate products and inspect administrative reports and disputes.

## 7. Authentication and Authorization

Better Auth is used for authentication and session management.

The server exposes compatibility paths for authentication requests so the client can use the configured API routes without depending on a single legacy path.

Credential login and registration have a stricter rate limit than normal API traffic.

After authentication, protected application routes use the authenticated session to determine the current user. Role specific middleware then checks whether the user has the required permissions.

The application also checks account status. Suspended accounts are prevented from performing protected actions and their real time connections are restricted.

## 8. Booking Lifecycle

The booking lifecycle is one of the central parts of the system.

A customer first selects a product and rental period.

The client requests an availability check and can request a price estimate.

When the customer creates the booking, the server validates the request and checks the current inventory state.

A new booking enters a pending state and temporarily holds the requested inventory.

The customer completes payment.

The server verifies the payment result. A successful verified payment moves the booking into the confirmed state.

The seller can then manage the booking through the supported booking state transitions.

When the customer returns the rented product, a return request can be created. The seller can process the return and the related deposit action.

If payment is not completed before the pending hold expires, the booking is moved to an expired terminal state and the inventory becomes available again.

## 9. Pricing

Rental pricing is calculated on the server.

The platform supports hourly, daily, weekly and monthly pricing tiers. The final rental price is calculated from the selected rental period and the pricing information stored with the product.

The client can request a price estimate before creating a booking.

The backend remains the source of truth for the final booking price. This prevents the application from trusting a price supplied only by the browser.

## 10. Availability and Overbooking Protection

Rental availability is different from ordinary ecommerce stock because the same product may be available for one date range and unavailable for another.

RentHub therefore uses date based inventory tracking.

The BookingInventory model maintains the inventory ledger used during booking operations. The booking service checks for conflicts before confirming an inventory hold.

This design is intended to handle concurrent booking requests without requiring Redis distributed locks.

Pending bookings also participate in the temporary hold mechanism. When a pending booking expires or is rejected, its inventory reservation is released.

Existing live bookings are reconciled into the inventory ledger during server startup.

## 11. API Organization

The API is organized under the following functional areas.

Categories

GET /categories

GET /categories/slug/:slug

GET /categories/:id

POST /categories

PATCH /categories/:id

DELETE /categories/:id

Product routes

GET /products

GET /products/featured

GET /products/slug/:slug

GET /products/:id

GET /products/mine

POST /products

PATCH /products/:id

POST /products/:id/images

DELETE /products/:id/images/:imageId

DELETE /products/:id

Booking routes

GET /bookings/price-estimate

GET /bookings/availability/:productId

POST /bookings

GET /bookings/my-bookings

GET /bookings/seller-bookings

GET /bookings/:id

PATCH /bookings/:id/status

POST /bookings/:id/cancel

POST /bookings/:id/return

Cart routes

GET /cart

POST /cart

PATCH /cart/:id

DELETE /cart/:id

DELETE /cart

Wishlist routes

GET /wishlist

POST /wishlist/toggle

GET /wishlist/check/:productId

Payment routes

GET /payments/esewa/success

POST /payments/process

GET /payments/booking/:bookingId

POST /payments/booking/:bookingId/release-deposit

POST /payments/booking/:bookingId/deduct-deposit

Review routes

GET /reviews/product/:productId

GET /reviews/seller/:sellerId

POST /reviews

POST /reviews/:reviewId/reply

Messaging routes

GET /messages/conversations

GET /messages/conversations/:conversationId

POST /messages/send

POST /messages/start

Notification routes

GET /notifications

PATCH /notifications/:id/read

POST /notifications/mark-all-read

User routes

GET /users/me

PATCH /users/profile

POST /users/become-seller

POST /users/seller/disband

POST /users/seller/disband-request

PATCH /users/seller/settings

GET /users/seller/earnings

GET /users/customer/stats

Administrative routes

GET /admin/dashboard

GET /admin/users

GET /admin/sellers

POST /admin/users/:userId/suspend

POST /admin/users/:userId/unsuspend

POST /admin/sellers/:sellerId/moderate

POST /admin/products/:productId/toggle

GET /admin/reports

GET /admin/disputes

All API routes are mounted through the Express application and are available through the repository's API compatibility prefixes. The health endpoint is available at /health.

## 12. Project Structure

The repository is divided into client and server applications.

The client contains the React application.

client/src/app contains application setup and routes.

client/src/components contains shared interface components.

client/src/hooks contains reusable React hooks.

client/src/lib contains API and utility code.

client/src/pages contains marketplace, customer, seller and administrative screens.

client/src/stores contains client side state stores.

client/src/types contains TypeScript type definitions.

The server contains the Express application.

server/src/config contains authentication, database, environment, Cloudinary and Redis configuration.

server/src/db contains database seed and database related scripts.

server/src/middleware contains authentication, authorization, validation, upload, rate limiting, account status and error handling middleware.

server/src/models contains Mongoose domain models.

server/src/modules contains business modules for administration, bookings, cart, categories, messaging, notifications, payments, products, reviews, users and wishlist.

server/src/sockets contains Socket.IO handling.

server/src/utils contains shared server utilities.

server/test contains automated tests.

## 13. Important Data Models

The main MongoDB models include the following.

User stores account and profile information, roles, seller information and account status.

Product stores rental listing information, seller ownership, category, pricing, availability related data and product images.

Category stores marketplace categories and slugs.

Booking stores customer and product references, rental period, price, deposit and booking state.

BookingInventory stores date based inventory information used to protect availability.

CartItem stores products placed in a customer's cart.

Wishlist stores customer saved products.

Payment stores payment related information associated with a booking.

Review stores customer reviews and seller replies.

Messaging stores conversations and message information.

Notification stores user notification records.

Moderation stores administrative moderation related information.

## 14. Environment Configuration

The root .env.example file documents the server configuration.

The main variables include the following.

MONGODB_URI controls the MongoDB connection.

PORT controls the Express server port. The default is 5000.

CLIENT_URL identifies the frontend origin. The default development value is http://localhost:3000.

BETTER_AUTH_SECRET is the authentication secret and must be replaced with a strong secret.

BETTER_AUTH_URL identifies the backend authentication URL.

REDIS_ENABLED controls whether Redis is used.

REDIS_URL and REDIS_PASSWORD configure Redis when enabled.

CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET configure image storage.

SMTP variables configure email delivery.

ESEWA_PRODUCT_CODE, ESEWA_SECRET_KEY, ESEWA_CHECKOUT_URL and ESEWA_STATUS_URL configure eSewa.

PENDING_BOOKING_TTL_MINUTES controls the lifetime of a pending booking. The default is 20 minutes.

RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX control the general API rate limit.

The client also contains its own environment example file for frontend configuration.

Never commit real production secrets to the repository.

## 15. Local Development Setup

### Prerequisites

Install Node.js version 20 or newer.

Install MongoDB locally or run MongoDB with Docker.

Redis is optional for development.

A Cloudinary account is required if image uploads are configured to use Cloudinary.

eSewa UAT credentials can be used for development and demonstration.

### Clone the Repository

Clone the repository and move into the project directory.

git clone https://github.com/BijayLamichhane/Project_Ecommerce.git

cd Project_Ecommerce

### Configure Environment

Copy the root environment example file into a local environment file.

cp .env.example .env

Update the values for MongoDB, Better Auth, Cloudinary, email and payment configuration as needed.

Do not use development secrets in production.

### Install Dependencies

The repository provides a root command that installs both applications.

npm run install:all

Dependencies can also be installed separately.

cd server

npm install

cd ../client

npm install

### Seed Demo Data

Run the server seed command.

cd server

npm run db:seed

The seed process creates demonstration users, sellers, categories, products, bookings, reviews and notifications.

### Start the Backend

From the server directory run:

npm run dev

The default API server runs on port 5000.

### Start the Frontend

From the client directory run:

npm run dev

The default Vite client runs on port 3000.

The application is then available through the local frontend address.

## 16. Demo Accounts

The current seed data includes demonstration accounts.

Administrator account

Email: admin@renthub.app

Seller account

Email: apex.rentals@renthub.app

Customer account

Email: prashant@example.com

The repository currently documents the shared seeded demonstration password as Password123!

These credentials are intended for local or university demonstrations only. They should not be used for a production deployment.

## 17. Docker Development

Docker Compose provides local infrastructure services.

MongoDB is exposed on port 27017 by default.

Redis is exposed on port 6379 by default.

PostgreSQL is also defined in the compose file, but the current application code does not use it as its primary database.

Adminer is available on port 8080 when the compose stack is running.

For the current application, MongoDB is the database service that must be available for normal server operation.

Redis can remain disabled when the application is being developed without caching or distributed rate limiting.

## 18. Testing

The server uses Vitest for automated tests.

Run the complete test suite from the server directory.

npm test

The current test suite covers important application behavior including pricing, booking conflicts, booking expiry, booking state transitions, payment related recovery behavior, HTTP authorization boundaries and upload signature detection.

Tests are kept under the server/test directory so that test code remains separate from the main application source.

## 19. Security Design

Security is handled at several layers.

Helmet is used to add security related HTTP headers.

CORS is restricted to configured frontend origins.

Authentication is handled by Better Auth.

Role based access control protects seller and administrator operations.

Suspended accounts are blocked from protected application actions.

Credential authentication has a stricter rate limit.

General API traffic has a configurable rate limit.

Zod validates request bodies, parameters and query values.

Product image uploads check file signatures in addition to declared MIME types.

Password hashes are not returned through application user responses.

WebSocket connections derive identity from the authenticated session.

Conversation authorization checks whether the user is a real participant before access is granted.

Payment confirmation is performed on the server rather than trusting a frontend success state.

Production startup checks prevent development authentication and payment secrets from being used accidentally.

## 20. Image Uploads

Product images are uploaded through the product image endpoint.

The server uses Multer for multipart form processing and validates uploaded content before storage.

Cloudinary configuration is available for managed image storage.

The upload layer performs content signature validation so that the server does not rely only on the file extension or MIME type supplied by the browser.

## 21. Real Time Communication

Socket.IO is used for customer and seller communication.

The socket layer authenticates the connection using the Better Auth session.

The server does not trust a user identifier supplied directly by the client.

Conversation membership is checked before a user can access or participate in a conversation.

The real time layer supports message delivery, typing indicators and notification related events.

Suspended accounts are prevented from joining conversations or sending and typing messages.

## 22. Payment and Production Notes

The current project is suitable for development and demonstration with eSewa UAT configuration.

Before production deployment, replace all development credentials with real merchant configuration.

The production checkout and status endpoints must match the merchant environment.

Payment results must continue to be verified on the server.

The card gateway configuration is currently disabled and should not be presented as a completed production card payment integration.

Seller payout card information is intended for demonstration and stores masked information rather than full payment card details.

## 23. Troubleshooting

### MongoDB connection failure

Confirm that MongoDB is running and that MONGODB_URI points to the correct database.

If Docker is being used, confirm that the MongoDB container is healthy and that the port is not already occupied.

### Frontend cannot reach the backend

Confirm that the server is running on port 5000 and that the client configuration points to the correct API origin.

Check CLIENT_URL and the frontend environment configuration.

### Authentication problems

Confirm that BETTER_AUTH_SECRET and BETTER_AUTH_URL are configured correctly.

For local development, make sure the frontend origin is one of the allowed CORS origins.

### Images are not uploading

Confirm the Cloudinary configuration and check that the uploaded file is a supported image.

The upload endpoint rejects files that do not match the expected content signature.

### Redis problems

Redis is optional. If Redis is disabled, the application can use its fallback behavior.

If Redis is enabled, verify REDIS_ENABLED, REDIS_URL and REDIS_PASSWORD.

### Booking appears unavailable

Check the requested rental dates and existing bookings.

Pending bookings may temporarily hold inventory until the configured pending booking timeout expires.

### Payment appears successful in the browser but booking is not confirmed

The application intentionally verifies payment on the server. A frontend success screen does not by itself confirm the booking.

Check the server logs and payment configuration before treating the booking as paid.

## 24. Deployment Considerations

A production deployment should separate the client and server deployment environments or use a reverse proxy that routes traffic to each application.

Set NODE_ENV to production.

Use a strong Better Auth secret.

Use production MongoDB credentials and network restrictions.

Configure Cloudinary with production credentials if image storage is required.

Configure a production email provider if email features are enabled.

Use production eSewa merchant credentials and endpoints.

Set a trusted CLIENT_URL.

Enable Redis when multiple server instances require shared caching or distributed rate limiting.

Do not expose development databases or administrative tools publicly.

Run the server test suite before deployment.

Review application logs after deployment and monitor authentication, booking, payment and upload failures.

## 25. Current Limitations

The project is primarily a rental marketplace rather than a traditional ecommerce store that permanently transfers product ownership.

PostgreSQL and Adminer are included in Docker Compose but are not part of the current application data path.

The debit and credit card gateway configuration is present as a future integration point and is disabled.

The eSewa integration is documented for development and demonstration and requires production merchant configuration before real deployment.

The current documentation describes the repository state at the time it was prepared. Future feature changes should be reflected in the documentation.

## 26. Maintenance Guidelines

When adding a new feature, update the relevant module documentation and the project overview when the feature changes the user workflow.

When an environment variable is added, update .env.example and this documentation.

When an API route changes, update the API organization section.

When a database model changes, update the data model section.

When a security boundary changes, update the security section and add or update tests.

When deployment requirements change, update the deployment section.

Documentation should describe the application as it exists rather than describing planned behavior as if it were already implemented.

## 27. Recommended Documentation Layout

The repository can keep this document as the detailed project reference while the root README remains focused on project discovery and quick setup.

The README should answer what the project is, why it exists, its main features and how to start it.

This project documentation should answer how the system works, how the modules are organized, how the main workflows behave and how the application should be configured and maintained.

This separation keeps the first page readable while giving developers enough detail when they need to understand or maintain the system.

## 28. Documentation Sources

The documentation structure follows common repository documentation practices.

GitHub recommends that a README explain what a project does, why it is useful, how users can get started, where they can get help and who maintains the project.

GitHub also recommends structuring documentation for readability, using meaningful headings, plain language and scannable sections.

The current document applies those principles while focusing on the actual RentHub repository rather than using a generic template.

Primary documentation references

GitHub documentation best practices

https://docs.github.com/en/contributing/writing-for-github-docs/best-practices-for-github-docs

GitHub repository best practices

https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories

GitHub repository README documentation

https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes

## 29. Project Status

RentHub is an active full stack rental marketplace project with customer, seller and administrator workflows implemented across the client and server applications.

The project includes authentication, product management, booking management, availability handling, payments, deposits, reviews, messaging, notifications, seller onboarding, administration and security controls.

The repository should be treated as the source of truth for implementation details. This document is intended to make those details easier to understand without requiring a developer to inspect the entire codebase before getting started.

## 30. Conclusion

RentHub is structured as a practical full stack rental marketplace with a clear separation between frontend presentation, backend business logic and persistent data.

The application goes beyond a simple product listing system by handling rental periods, availability conflicts, temporary booking holds, payment verification, security deposits, seller workflows, real time communication and administrative controls.

The current architecture gives the project a solid base for continued development. Future work should preserve the existing separation of concerns, keep security decisions on the server and update the documentation whenever the application behavior changes.
