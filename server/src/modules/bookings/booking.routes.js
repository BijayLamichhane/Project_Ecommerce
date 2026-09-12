import { Router } from "express";
import { bookingController } from "./booking.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireSeller } from "../../middleware/authorize.js";
import { validateParams, validateBody } from "../../middleware/validate.js";
import {
  createBookingSchema,
  updateBookingStatusSchema,
  cancelBookingSchema,
  returnRequestSchema,
} from "./booking.schema.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: z.string() });
const availabilityQuerySchema = z.object({
  productId: z.string(),
});

router.get(
  "/price-estimate",
  (req, res, next) => bookingController.calculatePrice(req, res, next)
);

router.get(
  "/availability/:productId",
  validateParams(availabilityQuerySchema),
  (req, res, next) => bookingController.getAvailability(req, res, next)
);

router.post(
  "/",
  authenticate,
  validateBody(createBookingSchema),
  (req, res, next) => bookingController.create(req, res, next)
);

router.get(
  "/my-bookings",
  authenticate,
  (req, res, next) => bookingController.getMyBookings(req, res, next)
);

router.get(
  "/seller-bookings",
  authenticate,
  requireSeller,
  (req, res, next) => bookingController.getSellerBookings(req, res, next)
);

router.get(
  "/:id",
  authenticate,
  validateParams(idSchema),
  (req, res, next) => bookingController.getById(req, res, next)
);

router.patch(
  "/:id/status",
  authenticate,
  validateParams(idSchema),
  validateBody(updateBookingStatusSchema),
  (req, res, next) => bookingController.updateStatus(req, res, next)
);

router.post(
  "/:id/cancel",
  authenticate,
  validateParams(idSchema),
  validateBody(cancelBookingSchema),
  (req, res, next) => bookingController.cancel(req, res, next)
);

router.post(
  "/:id/return",
  authenticate,
  validateParams(idSchema),
  validateBody(returnRequestSchema),
  (req, res, next) => bookingController.requestReturn(req, res, next)
);

export default router;
