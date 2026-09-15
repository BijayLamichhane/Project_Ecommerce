import { paymentService } from "./payment.service.js";
import { env } from "../../config/env.js";
import { sendSuccess } from "../../utils/response.js";

export class PaymentController {
  async processPayment(req, res, next) {
    try {
      const result = await paymentService.processPayment(req.user.id, req.body);
      sendSuccess(res, result, "Payment initialized");
    } catch (error) { next(error); }
  }

  async getPaymentByBooking(req, res, next) {
    try {
      const result = await paymentService.getPaymentByBooking(req.user.id, req.params.bookingId, req.user.role);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  }

  async esewaSuccess(req, res) {
    try {
      const result = await paymentService.handleEsewaSuccess(req.query.data);
      res.redirect(`${env.CLIENT_URL}/bookings/${encodeURIComponent(result.bookingId)}?payment=success`);
    } catch (error) {
      res.redirect(`${env.CLIENT_URL}/bookings?payment=failed&reason=${encodeURIComponent(error.message || "Payment verification failed")}`);
    }
  }

  async khaltiSuccess(req, res) {
    try {
      const result = await paymentService.handleKhaltiSuccess(req.query);
      res.redirect(`${env.CLIENT_URL}/bookings/${encodeURIComponent(result.bookingId)}?payment=success`);
    } catch (error) {
      res.redirect(`${env.CLIENT_URL}/bookings?payment=failed&reason=${encodeURIComponent(error.message || "Payment verification failed")}`);
    }
  }

  async releaseDeposit(req, res, next) {
    try {
      const result = await paymentService.releaseDeposit(req.user.id, req.params.bookingId, req.user.role);
      sendSuccess(res, result, "Security deposit released");
    } catch (error) { next(error); }
  }

  async deductDeposit(req, res, next) {
    try {
      const result = await paymentService.deductDeposit(req.user.id, req.params.bookingId, req.body, req.user.role);
      sendSuccess(res, result, "Deposit deduction applied");
    } catch (error) { next(error); }
  }
}
export const paymentController = new PaymentController();