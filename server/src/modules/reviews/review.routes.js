import { Router } from "express";
import { reviewController } from "./review.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams, validateBody } from "../../middleware/validate.js";
import { createReviewSchema, replyReviewSchema } from "./review.schema.js";
import { z } from "zod";

const router = Router();
const productIdSchema = z.object({ productId: z.string().min(1) });
const sellerIdSchema = z.object({ sellerId: z.string().min(1) });
const reviewIdSchema = z.object({ reviewId: z.string().min(1) });

router.get(
  "/product/:productId",
  validateParams(productIdSchema),
  (req, res, next) => reviewController.getProductReviews(req, res, next)
);

router.get(
  "/seller/:sellerId",
  validateParams(sellerIdSchema),
  (req, res, next) => reviewController.getSellerReviews(req, res, next)
);

router.post(
  "/",
  authenticate,
  validateBody(createReviewSchema),
  (req, res, next) => reviewController.createReview(req, res, next)
);

router.post(
  "/:reviewId/reply",
  authenticate,
  validateParams(reviewIdSchema),
  validateBody(replyReviewSchema),
  (req, res, next) => reviewController.replyToReview(req, res, next)
);

export default router;
