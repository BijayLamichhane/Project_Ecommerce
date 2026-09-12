import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/authorize.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import { z } from "zod";

const router = Router();
const userIdSchema = z.object({ userId: z.string().min(1) });
const sellerIdSchema = z.object({ sellerId: z.string().min(1) });
const productIdSchema = z.object({ productId: z.string().min(1) });

router.use(authenticate, requireAdmin);

router.get("/dashboard", (req, res, next) =>
  adminController.getDashboard(req, res, next)
);

router.get("/users", (req, res, next) =>
  adminController.getUsers(req, res, next)
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
  (req, res, next) => adminController.moderateSeller(req, res, next)
);

router.post(
  "/products/:productId/toggle",
  validateParams(productIdSchema),
  (req, res, next) => adminController.toggleProduct(req, res, next)
);

router.get("/reports", (req, res, next) =>
  adminController.getReports(req, res, next)
);

router.get("/disputes", (req, res, next) =>
  adminController.getDisputes(req, res, next)
);

export default router;
