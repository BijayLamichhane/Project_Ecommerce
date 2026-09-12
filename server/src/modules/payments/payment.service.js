import { paymentRepository } from "./payment.repository.js";
import { bookingRepository } from "../bookings/booking.repository.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

export class PaymentService {
  async processPayment(userId, input) {
    const booking = await bookingRepository.findById(input.bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (booking.customerId !== userId) {
      throw new ForbiddenError("Not authorized to pay for this booking");
    }
    if (booking.status !== "pending") {
      throw new ValidationError(`Cannot pay for a booking with status "${booking.status}"`);
    }

    const existingPayment = await paymentRepository.findByBookingId(input.bookingId);
    if (existingPayment && existingPayment.status === "completed") {
      throw new ValidationError("Booking is already paid");
    }

    const totalWithDeposit = Number(booking.totalAmount) + Number(booking.totalDeposit);
    const paymentId = uuidv4();

    const payment = await paymentRepository.createPayment({
      _id: paymentId,
      bookingId: booking.id,
      userId,
      amount: String(totalWithDeposit),
      currency: "NPR",
      status: "completed",
      paymentMethod: input.paymentMethod,
      transactionId: `sim_${paymentId.substring(0, 12)}`,
    });

    await bookingRepository.updateStatus(booking.id, "confirmed");

    return {
      payment,
      bookingStatus: "confirmed",
      message: "Payment processed successfully and booking is confirmed",
    };
  }

  async getPaymentByBooking(userId, bookingId, userRole) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (userRole !== "admin" && booking.customerId !== userId && booking.sellerId !== userId) {
      throw new ForbiddenError();
    }

    const payment = await paymentRepository.findByBookingId(bookingId);
    return {
      payment,
      bookingSummary: {
        id: booking.id,
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
    if (userRole !== "admin" && booking.sellerId !== userId) {
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
    if (userRole !== "admin" && booking.sellerId !== userId) {
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
