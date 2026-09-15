import { paymentRepository } from "./payment.repository.js";
import { bookingRepository } from "../bookings/booking.repository.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

export class PaymentService {
  async processPayment(userId, input) {
    const bookingId = input?.bookingId;
    if (!bookingId) throw new ValidationError("Booking ID is required");

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (String(booking.customerId) !== String(userId)) {
      throw new ForbiddenError("Not authorized to pay for this booking");
    }
    if (booking.status !== "pending") {
      throw new ValidationError(`Cannot pay for a booking with status "${booking.status}"`);
    }

    const existingPayment = await paymentRepository.findByBookingId(bookingId);
    if (existingPayment && existingPayment.status === "completed") {
      throw new ValidationError("Booking is already paid");
    }

    const totalWithDeposit = Number(booking.totalAmount) + Number(booking.totalDeposit);
    if (!Number.isFinite(totalWithDeposit) || totalWithDeposit < 0) {
      throw new ValidationError("Invalid booking payment amount");
    }

    const paymentId = uuidv4();

    const payment = await paymentRepository.createPayment({
      _id: paymentId,
      bookingId,
      userId,
      amount: String(totalWithDeposit),
      currency: "NPR",
      status: "completed",
      paymentMethod: input.paymentMethod,
      transactionId: `sim_${paymentId.substring(0, 12)}`,
    });

    await bookingRepository.updateStatus(bookingId, "confirmed");

    return {
      payment,
      bookingStatus: "confirmed",
      message: "Payment processed successfully and booking is confirmed",
    };
  }

  async getPaymentByBooking(userId, bookingId, userRole) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (userRole !== "admin" && String(booking.customerId) !== String(userId) && String(booking.sellerId) !== String(userId)) {
      throw new ForbiddenError();
    }

    const payment = await paymentRepository.findByBookingId(bookingId);
    return {
      payment,
      bookingSummary: {
        id: booking.id || booking._id,
        totalRentalPrice: booking.totalRentalPrice,
        totalDeposit: booking.totalDeposit,
        serviceFee: booking.serviceFee,
        deliveryFee: booking.deliveryFee,
        totalAmount: booking.totalAmount,
        status: booking.status,
      },
    };
  }

  async releaseDeposit(userId, bookingId, userRole) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (userRole !== "admin" && String(booking.sellerId) !== String(userId)) {
      throw new ForbiddenError("Only seller or admin can release deposit");
    }

    return {
      message: "Security deposit released",
      bookingId,
      releasedAmount: booking.totalDeposit,
      status: "released",
    };
  }

  async deductDeposit(userId, bookingId, input, userRole) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (userRole !== "admin" && String(booking.sellerId) !== String(userId)) {
      throw new ForbiddenError("Only seller or admin can deduct from deposit");
    }

    const totalDeposit = Number(booking.totalDeposit || 0);
    if (input.deductedAmount > totalDeposit) {
      throw new ValidationError("Deducted amount cannot exceed total deposit amount");
    }

    const releasedAmount = totalDeposit - input.deductedAmount;
    return {
      message: "Deposit deduction applied",
      bookingId,
      deductedAmount: input.deductedAmount,
      deductionReason: input.deductionReason,
      releasedAmount,
      status: input.deductedAmount === totalDeposit ? "forfeited" : "partially_released",
    };
  }
}

export const paymentService = new PaymentService();
