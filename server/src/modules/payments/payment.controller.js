import { paymentService } from "./payment.service.js";
import { sendSuccess } from "../../utils/response.js";

export class PaymentController {
  async processPayment(req, res, next) {
    try {
      const result = await paymentService.processPayment(req.user.id, req.body);
      sendSuccess(res, result, "Payment completed successfully");
    } catch (error) {
      next(error);
    }
  }

  async getPaymentByBooking(req, res, next) {
    try {
      const result = await paymentService.getPaymentByBooking(
        req.user.id,
        req.params.bookingId,
        req.user.role
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async releaseDeposit(req, res, next) {
    try {
      const result = await paymentService.releaseDeposit(
        req.user.id,
        req.params.bookingId,
        req.user.role
      );
      sendSuccess(res, result, "Security deposit released");
    } catch (error) {
      next(error);
    }
  }

  async deductDeposit(req, res, next) {
    try {
      const result = await paymentService.deductDeposit(
        req.user.id,
        req.params.bookingId,
        req.body,
        req.user.role
      );
      sendSuccess(res, result, "Deposit deduction applied");
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
