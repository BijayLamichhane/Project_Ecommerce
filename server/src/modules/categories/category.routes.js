import { Router } from "express";
import { categoryController } from "./category.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/authorize.js";
import { validateParams, validateBody } from "../../middleware/validate.js";
import { createCategorySchema, updateCategorySchema } from "./category.schema.js";
import { z } from "zod";

const router = Router();
const idParamSchema = z.object({ id: z.string() });
const slugParamSchema = z.object({ slug: z.string() });

router.get("/", (req, res, next) => categoryController.getAll(req, res, next));

router.get(
  "/slug/:slug",
  validateParams(slugParamSchema),
  (req, res, next) => categoryController.getBySlug(req, res, next)
);

router.get(
  "/:id",
  validateParams(idParamSchema),
  (req, res, next) => categoryController.getById(req, res, next)
);

router.post(
  "/",
  authenticate,
  requireAdmin,
  validateBody(createCategorySchema),
  (req, res, next) => categoryController.create(req, res, next)
);

router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validateParams(idParamSchema),
  validateBody(updateCategorySchema),
  (req, res, next) => categoryController.update(req, res, next)
);

router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  validateParams(idParamSchema),
  (req, res, next) => categoryController.delete(req, res, next)
);

export default router;
