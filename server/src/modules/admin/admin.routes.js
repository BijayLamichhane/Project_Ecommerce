import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/authorize.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { z } from "zod";

const router = Router();
const userIdSchema = z.object({ userId: z.string().min(1) });
const sellerIdSchema = z.object({ sellerId: z.string().min(1) });
const productIdSchema = z.object({ productId: z.string().min(1) });
const adminProductsQuerySchema = z.object({
  q: z.string().trim().max(255).optional(),
  status: z.enum(["all", "active", "inactive", "suspended", "draft", "deleted"]).default("all"),
  featured: z.enum(["all", "featured", "standard"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const moderateSellerBodySchema = z.object({
  status: z.enum(["approved", "rejected", "suspended", "pending"]),
  reason: z.string().max(1000).optional(),
});
const toggleProductBodySchema = z.object({
  status: z.enum(["active", "inactive", "suspended", "draft", "deleted"]),
});
const featureProductBodySchema = z.object({
  isFeatured: z.boolean(),
});

router.use(authenticate, requireAdmin);

router.get("/dashboard", (req, res, next) =>
  adminController.getDashboard(req, res, next)
);

router.get("/users", (req, res, next) =>
  adminController.getUsers(req, res, next)
);

router.get(
  "/products",
  validateQuery(adminProductsQuerySchema),
  (req, res, next) => adminController.getProducts(req, res, next)
);

router.get("/sellers", (req, res, next) =>
  adminController.getSellers(req, res, next)
);

router.post(
  "/users/:userId/suspend",
  validateParams(userIdSchema),
  (req, res, next) => adminController.suspendUser(req, res, next)
);

router.post(
  "/users/:userId/unsuspend",
  validateParams(userIdSchema),
  (req, res, next) => adminController.unsuspendUser(req, res, next)
);

router.post(
  "/sellers/:sellerId/moderate",
  validateParams(sellerIdSchema),
  validateBody(moderateSellerBodySchema),
  (req, res, next) => adminController.moderateSeller(req, res, next)
);

router.patch(
  "/products/:productId/featured",
  validateParams(productIdSchema),
  validateBody(featureProductBodySchema),
  (req, res, next) => adminController.setProductFeatured(req, res, next)
);

router.post(
  "/products/:productId/toggle",
  validateParams(productIdSchema),
  validateBody(toggleProductBodySchema),
  (req, res, next) => adminController.toggleProduct(req, res, next)
);

router.get("/reports", (req, res, next) =>
  adminController.getReports(req, res, next)
);

router.get("/disputes", (req, res, next) =>
  adminController.getDisputes(req, res, next)
);

export default router;
