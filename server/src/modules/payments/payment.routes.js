import { Router } from "express";
import { paymentController } from "./payment.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams, validateBody } from "../../middleware/validate.js";
import { processPaymentSchema, cancelPaymentSchema, adjustDepositSchema } from "./payment.schema.js";
import { z } from "zod";

const router = Router();
const bookingIdSchema = z.object({ bookingId: z.string().min(1) });

router.get("/esewa/success", (req, res) => paymentController.esewaSuccess(req, res));
router.use(authenticate);
router.post("/process", validateBody(processPaymentSchema), (req, res, next) => paymentController.processPayment(req, res, next));
router.post("/booking/:bookingId/cancel", validateParams(bookingIdSchema), validateBody(cancelPaymentSchema), (req, res, next) => paymentController.cancelPayment(req, res, next));
router.get("/booking/:bookingId", validateParams(bookingIdSchema), (req, res, next) => paymentController.getPaymentByBooking(req, res, next));
router.post("/booking/:bookingId/release-deposit", validateParams(bookingIdSchema), (req, res, next) => paymentController.releaseDeposit(req, res, next));
router.post("/booking/:bookingId/deduct-deposit", validateParams(bookingIdSchema), validateBody(adjustDepositSchema), (req, res, next) => paymentController.deductDeposit(req, res, next));

export default router;
