import crypto from "node:crypto";
import { paymentRepository } from "./payment.repository.js";
import { bookingRepository } from "../bookings/booking.repository.js";
import { bookingService } from "../bookings/booking.service.js";
import { bookingInventoryRepository } from "../bookings/booking.inventory.repository.js";
import { notificationService } from "../notifications/notification.service.js";
import { emitProductAvailabilityChanged, emitToUser } from "../../sockets/index.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../middleware/errorHandler.js";
import { env } from "../../config/env.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger.js";

function signFields(fields, signedFieldNames) {
  const message = signedFieldNames
    .split(",")
    .map((name) => `${name}=${fields[name] ?? ""}`)
    .join(",");
  return crypto
    .createHmac("sha256", env.ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export class PaymentService {
  async processPayment(userId, input) {
    const bookingId = input?.bookingId;
    if (!bookingId) throw new ValidationError("Booking ID is required");
    if (!["esewa", "card"].includes(input.paymentMethod)) {
      throw new ValidationError("Choose a supported online payment method");
    }

    return input.paymentMethod === "card"
      ? this.initiateCardPayment(userId, bookingId)
      : this.initiateEsewaPayment(userId, bookingId);
  }

  async getPayableBooking(userId, bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (String(booking.customerId) !== String(userId)) {
      throw new ForbiddenError("Not authorized to pay for this booking");
    }
    if (booking.status === "expired") {
      throw new ValidationError(
        "This booking hold expired. Please create a new booking for these dates."
      );
    }
    if (booking.status !== "pending") {
      throw new ValidationError(
        `Cannot pay for a booking with status "${booking.status}"`
      );
    }

    const existingPayment = await paymentRepository.findByBookingId(bookingId);
    if (existingPayment?.status === "completed") {
      throw new ValidationError("Booking is already paid");
    }

    const totalAmount = Number(booking.totalAmount) + Number(booking.totalDeposit);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new ValidationError("Invalid booking payment amount");
    }

    return { booking, existingPayment, totalAmount };
  }

  async initiateEsewaPayment(userId, bookingId) {
    const { existingPayment, totalAmount } = await this.getPayableBooking(userId, bookingId);
    const transactionUuid = uuidv4().replace(/[^a-zA-Z0-9-]/g, "");
    const amount = totalAmount.toFixed(2);
    const paymentId = existingPayment?.id || uuidv4();

    if (!existingPayment) {
      await paymentRepository.createPayment({
        _id: paymentId,
        bookingId,
        userId,
        amount,
        currency: "NPR",
        status: "pending",
        paymentMethod: "esewa",
        transactionId: transactionUuid,
      });
    } else {
      await paymentRepository.updatePayment(existingPayment.id, {
        status: "pending",
        paymentMethod: "esewa",
        transactionId: transactionUuid,
        amount,
      });
    }

    const signedFieldNames = "total_amount,transaction_uuid,product_code";
    const fields = {
      amount,
      tax_amount: "0",
      total_amount: amount,
      transaction_uuid: transactionUuid,
      product_code: env.ESEWA_PRODUCT_CODE,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: `${env.BETTER_AUTH_URL}/api/v1/payments/esewa/success`,
      failure_url: `${env.CLIENT_URL}/bookings/${bookingId}?payment=failed`,
      signed_field_names: signedFieldNames,
      signature: signFields(
        {
          total_amount: amount,
          transaction_uuid: transactionUuid,
          product_code: env.ESEWA_PRODUCT_CODE,
        },
        signedFieldNames
      ),
    };

    return {
      paymentId,
      bookingId,
      paymentMethod: "esewa",
      action: env.ESEWA_CHECKOUT_URL,
      fields,
      amount,
      currency: "NPR",
    };
  }

  async initiateCardPayment(userId, bookingId) {
    const { existingPayment, totalAmount } = await this.getPayableBooking(userId, bookingId);

    if (env.NODE_ENV !== "production") {
      const amount = totalAmount.toFixed(2);
      const paymentId = existingPayment?.id || uuidv4();
      const transactionId = `DEMO-CARD-${uuidv4()}`;
      const paymentData = {
        bookingId,
        userId,
        amount,
        currency: "NPR",
        status: "pending",
        paymentMethod: "card",
        transactionId,
        paymentGatewayResponse: {
          mode: "development-demo",
          provider: "RentHub Demo Card Gateway",
          cardNetwork: "Visa",
          last4: "4242",
        },
      };

      const payment = existingPayment
        ? await paymentRepository.updatePayment(existingPayment.id, paymentData)
        : await paymentRepository.createPayment({ _id: paymentId, ...paymentData });

      const confirmation = await this.confirmBookingAfterPayment(
        await bookingRepository.findById(bookingId)
      );

      const completedPayment = await paymentRepository.updatePayment(payment.id, {
        status: "completed",
        paymentGatewayResponse: {
          ...(payment.paymentGatewayResponse || {}),
          completedAt: new Date(),
        },
      });

      if (confirmation.confirmedNow) {
        await this.notifyPaymentSuccess(confirmation.booking);
      }

      return {
        paymentId: payment.id || paymentId,
        bookingId,
        paymentMethod: "card",
        demo: true,
        message: "Development demo card payment completed successfully",
        amount,
        currency: "NPR",
        card: { network: "Visa", last4: "4242" },
        payment: completedPayment,
        payment_url: `${env.CLIENT_URL}/bookings/${encodeURIComponent(bookingId)}?payment=success&demo=card`,
      };
    }

    if (!env.CARD_GATEWAY_ENABLED) {
      throw new ValidationError(
        "Debit/credit card payments are not enabled. Configure the bank card gateway merchant credentials first."
      );
    }
    if (
      !env.CARD_GATEWAY_CHECKOUT_URL ||
      !env.CARD_GATEWAY_MERCHANT_ID ||
      !env.CARD_GATEWAY_SECRET
    ) {
      throw new ValidationError("Debit/credit card gateway configuration is incomplete.");
    }

    throw new ValidationError(
      "The card gateway adapter requires the provider-issued integration specification before live card checkout can be enabled."
    );
  }

  async confirmBookingAfterPayment(booking) {
    if (!booking) throw new NotFoundError("Booking");

    if (booking.status === "confirmed") {
      return { booking, confirmedNow: false };
    }

    if (booking.status === "pending") {
      await bookingInventoryRepository.confirmBooking(booking.id || booking._id);
      const confirmed = await bookingRepository.confirmPendingAfterPayment(
        booking.id || booking._id
      );

      if (confirmed) {
        await this.emitAvailabilityChanges(confirmed);
        return { booking: confirmed, confirmedNow: true };
      }

      const latest = await bookingRepository.findById(booking.id || booking._id);
      if (latest?.status === "confirmed") {
        return { booking: latest, confirmedNow: false };
      }
      if (latest?.status === "expired") {
        return this.confirmExpiredBookingAfterPayment(latest);
      }

      throw new ValidationError("The booking could not be confirmed after payment.");
    }

    if (booking.status === "expired") {
      const bookingId = booking.id || booking._id;

      try {
        await bookingInventoryRepository.reserveItems(
          bookingId,
          booking.bookingItems || [],
          "confirmed",
          null
        );
      } catch (error) {
        if (String(error?.message || "").startsWith("PRODUCT_UNAVAILABLE:")) {
          throw new ValidationError(
            "This payment arrived after the booking hold expired and the dates are no longer available. The payment must be refunded."
          );
        }
        throw error;
      }

      const confirmed = await bookingRepository.confirmExpiredAfterPayment(bookingId);
      if (!confirmed) {
        const latest = await bookingRepository.findById(bookingId);
        if (latest?.status === "confirmed") {
          return { booking: latest, confirmedNow: false };
        }
        await bookingInventoryRepository.releaseBooking(bookingId);
        throw new ValidationError("The expired booking could not be restored safely.");
      }

      await this.emitAvailabilityChanges(confirmed);
      return { booking: confirmed, confirmedNow: true };
    }

    throw new ValidationError(
      `Cannot confirm a booking with status "${booking.status}"`
    );
  }

  async confirmExpiredBookingAfterPayment(booking) {
    return this.confirmBookingAfterPayment(booking);
  }

  async notifyPaymentSuccess(booking) {
    const bookingId = booking.id || booking._id;
    const actionUrl = `/bookings/${encodeURIComponent(bookingId)}`;
    const productName = booking.bookingItems?.[0]?.product?.name || "your rental";

    try {
      const customerNotification = await notificationService.createNotification({
        userId: booking.customerId,
        type: "booking_payment_success",
        title: "Payment successful",
        message: `Payment received. Your dates for ${productName} are now confirmed.`,
        actionUrl,
      });

      emitToUser(booking.customerId, "booking_notification", customerNotification);

      const sellerNotification = await notificationService.createNotification({
        userId: booking.sellerId,
        type: "booking_payment_received",
        title: "Booking paid",
        message: `Payment received for ${productName}. The rental dates are confirmed.`,
        actionUrl,
      });

      emitToUser(booking.sellerId, "booking_notification", sellerNotification);
    } catch (error) {
      logger.warn({ error, bookingId }, "Failed to create booking payment notification");
    }
  }

  async emitAvailabilityChanges(booking) {
    for (const item of booking?.bookingItems || []) {
      if (item?.productId) emitProductAvailabilityChanged(item.productId);
    }
  }

  async markPaymentForManualRefund(payment, reason, gatewayResponse) {
    const existingResponse =
      payment.paymentGatewayResponse &&
      typeof payment.paymentGatewayResponse === "object"
        ? payment.paymentGatewayResponse
        : {};

    return paymentRepository.updatePayment(payment.id, {
      status: "refunded",
      paymentGatewayResponse: {
        ...existingResponse,
        ...gatewayResponse,
        refundRequired: true,
        refundReason: reason,
        refundFlaggedAt: new Date(),
      },
    });
  }

  async handleEsewaSuccess(encodedData) {
    if (!encodedData) throw new ValidationError("Missing eSewa payment response");

    let response;
    try {
      response = JSON.parse(
        Buffer.from(encodedData, "base64").toString("utf8")
      );
    } catch {
      throw new ValidationError("Invalid eSewa payment response");
    }

    const {
      transaction_uuid: transactionUuid,
      total_amount: totalAmount,
      status,
      signature,
      signed_field_names: signedFieldNames,
    } = response;

    if (!transactionUuid || !totalAmount || !signature || !signedFieldNames) {
      throw new ValidationError("Incomplete eSewa payment response");
    }
    if (status !== "COMPLETE") {
      throw new ValidationError(
        `eSewa payment status is ${status || "unknown"}`
      );
    }

    const payment = await paymentRepository.findByTransactionId(transactionUuid);
    if (!payment) throw new NotFoundError("Payment");

    const booking = await bookingRepository.findById(payment.bookingId);
    if (!booking) throw new NotFoundError("Booking");

    if (payment.status !== "completed") {
      const expectedSignature = signFields(response, signedFieldNames);
      if (!safeEqual(signature, expectedSignature)) {
        throw new ValidationError("eSewa signature verification failed");
      }
      if (response.product_code !== env.ESEWA_PRODUCT_CODE) {
        throw new ValidationError("Invalid eSewa product code");
      }
      if (Math.abs(Number(totalAmount) - Number(payment.amount)) > 0.01) {
        throw new ValidationError("eSewa payment amount does not match the booking");
      }

      const statusUrl = new URL(env.ESEWA_STATUS_URL);
      statusUrl.searchParams.set("product_code", env.ESEWA_PRODUCT_CODE);
      statusUrl.searchParams.set("total_amount", String(totalAmount));
      statusUrl.searchParams.set("transaction_uuid", transactionUuid);

      const statusResponse = await fetch(statusUrl);
      if (!statusResponse.ok) {
        throw new ValidationError("Could not verify the eSewa transaction status");
      }

      const verified = await statusResponse.json();
      if (verified.status !== "COMPLETE") {
        throw new ValidationError(
          `eSewa transaction verification returned ${verified.status || "unknown"}`
        );
      }

      if (booking.status === "cancelled") {
        const refunded = await this.markPaymentForManualRefund(
          payment,
          "Payment was received after the customer cancelled the booking.",
          { response, verification: verified }
        );
        throw new ValidationError(
          "Payment was received after you cancelled the booking. The payment has been flagged for refund."
        );
      }

      try {
        const confirmation = await this.confirmBookingAfterPayment(booking);
        const completed = await paymentRepository.updatePayment(payment.id, {
          status: "completed",
          paymentGatewayResponse: { response, verification: verified },
        });

        if (confirmation.confirmedNow) {
          await this.notifyPaymentSuccess(confirmation.booking);
        }

        return { payment: completed, bookingId: payment.bookingId };
      } catch (error) {
        if (
          booking.status === "expired" &&
          String(error?.message || "").includes("payment must be refunded")
        ) {
          await this.markPaymentForManualRefund(
            payment,
            error.message,
            { response }
          );
          throw new ValidationError(
            "Payment was received after the booking expired, but the dates were taken by another renter. The payment has been flagged for refund."
          );
        }
        throw error;
      }
    }

    const confirmation = await this.confirmBookingAfterPayment(booking);
    if (confirmation.confirmedNow) {
      await this.notifyPaymentSuccess(confirmation.booking);
    }

    return { payment, bookingId: payment.bookingId };
  }

  async cancelPayment(userId, bookingId, reason = "Payment cancelled by customer") {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (String(booking.customerId) !== String(userId)) {
      throw new ForbiddenError("You can only cancel your own payment");
    }
    if (booking.status !== "pending") {
      throw new ValidationError("Only a pending payment can be cancelled");
    }

    const payment = await paymentRepository.findByBookingId(bookingId);
    if (payment?.status === "completed") {
      throw new ValidationError("This payment has already been completed");
    }

    const cancelledBooking = await bookingService.cancelPendingForCustomer(
      bookingId,
      userId,
      reason
    );

    let cancelledPayment = null;
    if (payment?.status === "pending") {
      cancelledPayment = await paymentRepository.cancelPendingPayment(
        payment.id,
        reason
      );
      if (!cancelledPayment) {
        cancelledPayment = await paymentRepository.findByBookingId(bookingId);
      }
    }

    return {
      booking: cancelledBooking,
      payment: cancelledPayment || payment || null,
    };
  }

  async getPaymentByBooking(userId, bookingId, userRole) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (
      userRole !== "admin" &&
      String(booking.customerId) !== String(userId) &&
      String(booking.sellerId) !== String(userId)
    ) {
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
    if (
      userRole !== "admin" &&
      String(booking.sellerId) !== String(userId)
    ) {
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
    if (
      userRole !== "admin" &&
      String(booking.sellerId) !== String(userId)
    ) {
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
      status:
        input.deductedAmount === totalDeposit
          ? "forfeited"
          : "partially_released",
    };
  }
}

export const paymentService = new PaymentService();
