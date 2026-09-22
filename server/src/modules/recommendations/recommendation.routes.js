import { Router } from "express";
import { z } from "zod";
import { recommendationController } from "./recommendation.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams, validateQuery } from "../../middleware/validate.js";

const router = Router();

const limitSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => Math.min(20, Math.max(1, Number(value || 8)))),
});

const productParamSchema = z.object({
  productId: z.string().min(1),
});

router.get(
  "/personalized",
  authenticate,
  validateQuery(limitSchema),
  (req, res, next) => recommendationController.getPersonalized(req, res, next)
);

router.get(
  "/similar/:productId",
  validateParams(productParamSchema),
  validateQuery(limitSchema),
  (req, res, next) => recommendationController.getSimilar(req, res, next)
);

export default router;
