import { Router } from "express";
import { productController } from "./product.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireSeller } from "../../middleware/authorize.js";
import { validateQuery, validateParams, validateBody } from "../../middleware/validate.js";
import {
  productSearchSchema,
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
} from "./product.schema.js";
import { uploadProductImages } from "../../middleware/upload.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: z.string() });

router.get(
  "/",
  validateQuery(productSearchSchema),
  (req, res, next) => productController.search(req, res, next)
);

router.get(
  "/mine",
  authenticate,
  requireSeller,
  (req, res, next) => productController.getSellerProducts(req, res, next)
);

router.get("/featured", (req, res, next) => productController.getFeatured(req, res, next));

router.get("/slug/:slug", (req, res, next) => productController.getBySlug(req, res, next));

router.get(
  "/:id",
  validateParams(idSchema),
  (req, res, next) => productController.getById(req, res, next)
);

router.post(
  "/",
  authenticate,
  requireSeller,
  validateBody(createProductSchema),
  (req, res, next) => productController.create(req, res, next)
);

router.patch(
  "/:id",
  authenticate,
  requireSeller,
  validateParams(idSchema),
  validateBody(updateProductSchema),
  (req, res, next) => productController.update(req, res, next)
);

router.patch(
  "/:id/status",
  authenticate,
  requireSeller,
  validateParams(idSchema),
  validateBody(updateProductStatusSchema),
  (req, res, next) => productController.updateStatus(req, res, next)
);

router.post(
  "/:id/images",
  authenticate,
  requireSeller,
  validateParams(idSchema),
  uploadProductImages,
  (req, res, next) => productController.uploadImages(req, res, next)
);

router.delete(
  "/:id/images/:imageId",
  authenticate,
  requireSeller,
  (req, res, next) => productController.deleteImage(req, res, next)
);

router.delete(
  "/:id",
  authenticate,
  requireSeller,
  validateParams(idSchema),
  (req, res, next) => productController.delete(req, res, next)
);

export default router;
