import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env.js";
import { auth } from "./config/auth.js";
import { toNodeHandler } from "better-auth/node";
import { errorHandler } from "./middleware/errorHandler.js";
import { initCloudinary } from "./config/cloudinary.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import productRoutes from "./modules/products/product.routes.js";
import bookingRoutes from "./modules/bookings/booking.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import wishlistRoutes from "./modules/wishlist/wishlist.routes.js";
import paymentRoutes from "./modules/payments/payment.routes.js";
import reviewRoutes from "./modules/reviews/review.routes.js";
import messagingRoutes from "./modules/messaging/messaging.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import path from "node:path";
import userRoutes from "./modules/users/user.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

export function createApp() {
  const app = express();
  initCloudinary();

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  app.use("/api/v1/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  const corsOrigins =
    env.NODE_ENV === "production"
      ? [env.CLIENT_URL]
      : [env.CLIENT_URL, "http://localhost:3000", "http://localhost:5173"];

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    })
  );

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  const authHandler = toNodeHandler(auth);
  app.all(["/api/auth/*", "/api/v1/auth/*", "/api/v1/api/auth/*", "/auth/*"], (req, res, next) => {
    if (req.url.startsWith("/api/v1/api/auth")) {
      req.url = req.url.replace(/^\/api\/v1\/api\/auth/, "/api/auth");
    } else if (req.url.startsWith("/api/v1/auth")) {
      req.url = req.url.replace(/^\/api\/v1\/auth/, "/api/auth");
    } else if (req.url.startsWith("/auth")) {
      req.url = req.url.replace(/^\/auth/, "/api/auth");
    }
    return authHandler(req, res, next);
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  const apiRouter = express.Router();
  apiRouter.use("/categories", categoryRoutes);
  apiRouter.use("/products", productRoutes);
  apiRouter.use("/bookings", bookingRoutes);
  apiRouter.use("/cart", cartRoutes);
  apiRouter.use("/wishlist", wishlistRoutes);
  apiRouter.use("/payments", paymentRoutes);
  apiRouter.use("/reviews", reviewRoutes);
  apiRouter.use("/messages", messagingRoutes);
  apiRouter.use("/notifications", notificationRoutes);
  apiRouter.use("/users", userRoutes);
  apiRouter.use("/admin", adminRoutes);

  app.use(apiRouter);
  app.use("/api", apiRouter);
  app.use("/api/v1", apiRouter);
  app.use(errorHandler);

  return app;
}
