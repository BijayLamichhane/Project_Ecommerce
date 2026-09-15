import crypto from "node:crypto";
import { paymentRepository } from "./payment.repository.js";
import { bookingRepository } from "../bookings/booking.repository.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../middleware/errorHandler.js";
import { env } from "../../config/env.js";
import { v4 as uuidv4 } from "uuid";

function signFields(fields, signedFieldNames) {
  const message = signedFieldNames.split(",").map((name) => `${name}=${fields[name] ?? ""}`).join(",");
  return crypto.createHmac("sha256", env.ESEWA_SECRET_KEY).update(message).digest("base64");
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
    if (!["esewa", "card"].includes(input.paymentMethod)) throw new ValidationError("Choose a supported online payment method");
    return input.paymentMethod === "card"
      ? this.initiateCardPayment(userId, bookingId)
      : this.initiateEsewaPayment(userId, bookingId);
  }

  async getPayableBooking(userId, bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (String(booking.customerId) !== String(userId)) throw new ForbiddenError("Not authorized to pay for this booking");
    if (booking.status !== "pending") throw new ValidationError(`Cannot pay for a booking with status "${booking.status}"`);
    const existingPayment = await paymentRepository.findByBookingId(bookingId);
    if (existingPayment?.status === "completed") throw new ValidationError("Booking is already paid");
    const totalAmount = Number(booking.totalAmount) + Number(booking.totalDeposit);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new ValidationError("Invalid booking payment amount");
    return { booking, existingPayment, totalAmount };
  }

  async initiateEsewaPayment(userId, bookingId) {
    const { existingPayment, totalAmount } = await this.getPayableBooking(userId, bookingId);
    const transactionUuid = uuidv4().replace(/[^a-zA-Z0-9-]/g, "");
    const amount = totalAmount.toFixed(2);
    const paymentId = existingPayment?.id || uuidv4();
    if (!existingPayment) {
      await paymentRepository.createPayment({ _id: paymentId, bookingId, userId, amount, currency: "NPR", status: "pending", paymentMethod: "esewa", transactionId: transactionUuid });
    } else {
      await paymentRepository.updatePayment(existingPayment.id, { status: "pending", paymentMethod: "esewa", transactionId: transactionUuid, amount });
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
      signature: signFields({ total_amount: amount, transaction_uuid: transactionUuid, product_code: env.ESEWA_PRODUCT_CODE }, signedFieldNames),
    };
    return { paymentId, bookingId, paymentMethod: "esewa", action: env.ESEWA_CHECKOUT_URL, fields, amount, currency: "NPR" };
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
        status: "completed",
        paymentMethod: "card",
        transactionId,
        paymentGatewayResponse: {
          mode: "development-demo",
          provider: "RentHub Demo Card Gateway",
          cardNetwork: "Visa",
          last4: "4242",
        },
      };

      const completedPayment = existingPayment
        ? await paymentRepository.updatePayment(existingPayment.id, paymentData)
        : await paymentRepository.createPayment({ _id: paymentId, ...paymentData });

      if (existingPayment?.status !== "completed") {
        await bookingRepository.updateStatus(bookingId, "confirmed");
      }

      return {
        paymentId,
        bookingId,
        paymentMethod: "card",
        demo: true,
        message: "Development demo card payment completed successfully",
        amount,
        currency: "NPR",
        card: { network: "Visa", last4: "4242" },
        payment: completedPayment,
      };
    }

    if (!env.CARD_GATEWAY_ENABLED) {
      throw new ValidationError("Debit/credit card payments are not enabled. Configure the bank card gateway merchant credentials first.");
    }
    if (!env.CARD_GATEWAY_CHECKOUT_URL || !env.CARD_GATEWAY_MERCHANT_ID || !env.CARD_GATEWAY_SECRET) {
      throw new ValidationError("Debit/credit card gateway configuration is incomplete.");
    }
    throw new ValidationError("The card gateway adapter requires the provider-issued integration specification before live card checkout can be enabled.");
  }

  async handleEsewaSuccess(encodedData) {
    if (!encodedData) throw new ValidationError("Missing eSewa payment response");
    let response;
    try { response = JSON.parse(Buffer.from(encodedData, "base64").toString("utf8")); } catch { throw new ValidationError("Invalid eSewa payment response"); }
    const { transaction_uuid: transactionUuid, total_amount: totalAmount, status, signature, signed_field_names: signedFieldNames } = response;
    if (!transactionUuid || !totalAmount || !signature || !signedFieldNames) throw new ValidationError("Incomplete eSewa payment response");
    if (status !== "COMPLETE") throw new ValidationError(`eSewa payment status is ${status || "unknown"}`);
    const payment = await paymentRepository.findByTransactionId(transactionUuid);
    if (!payment) throw new NotFoundError("Payment");
    if (payment.status === "completed") return { payment, bookingId: payment.bookingId };
    const booking = await bookingRepository.findById(payment.bookingId);
    if (!booking) throw new NotFoundError("Booking");
    const expectedSignature = signFields(response, signedFieldNames);
    if (!safeEqual(signature, expectedSignature)) throw new ValidationError("eSewa signature verification failed");
    if (response.product_code !== env.ESEWA_PRODUCT_CODE) throw new ValidationError("Invalid eSewa product code");
    if (Math.abs(Number(totalAmount) - Number(payment.amount)) > 0.01) throw new ValidationError("eSewa payment amount does not match the booking");
    const statusUrl = new URL(env.ESEWA_STATUS_URL);
    statusUrl.searchParams.set("product_code", env.ESEWA_PRODUCT_CODE);
    statusUrl.searchParams.set("total_amount", String(totalAmount));
    statusUrl.searchParams.set("transaction_uuid", transactionUuid);
    const statusResponse = await fetch(statusUrl);
    if (!statusResponse.ok) throw new ValidationError("Could not verify the eSewa transaction status");
    const verified = await statusResponse.json();
    if (verified.status !== "COMPLETE") throw new ValidationError(`eSewa transaction verification returned ${verified.status || "unknown"}`);
    const completed = await paymentRepository.updatePayment(payment.id, { status: "completed", paymentGatewayResponse: { response, verification: verified } });
    if (booking.status === "pending") await bookingRepository.updateStatus(payment.bookingId, "confirmed");
    return { payment: completed, bookingId: payment.bookingId };
  }

  async getPaymentByBooking(userId, bookingId, userRole) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (userRole !== "admin" && String(booking.customerId) !== String(userId) && String(booking.sellerId) !== String(userId)) throw new ForbiddenError();
    const payment = await paymentRepository.findByBookingId(bookingId);
    return { payment, bookingSummary: { id: booking.id || booking._id, totalRentalPrice: booking.totalRentalPrice, totalDeposit: booking.totalDeposit, serviceFee: booking.serviceFee, deliveryFee: booking.deliveryFee, totalAmount: booking.totalAmount, status: booking.status } };
  }

  async releaseDeposit(userId, bookingId, userRole) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (userRole !== "admin" && String(booking.sellerId) !== String(userId)) throw new ForbiddenError("Only seller or admin can release deposit");
    return { message: "Security deposit released", bookingId, releasedAmount: booking.totalDeposit, status: "released" };
  }

  async deductDeposit(userId, bookingId, input, userRole) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (userRole !== "admin" && String(booking.sellerId) !== String(userId)) throw new ForbiddenError("Only seller or admin can deduct from deposit");
    const totalDeposit = Number(booking.totalDeposit || 0);
    if (input.deductedAmount > totalDeposit) throw new ValidationError("Deducted amount cannot exceed total deposit amount");
    const releasedAmount = totalDeposit - input.deductedAmount;
    return { message: "Deposit deduction applied", bookingId, deductedAmount: input.deductedAmount, deductionReason: input.deductionReason, releasedAmount, status: input.deductedAmount === totalDeposit ? "forfeited" : "partially_released" };
  }
}
export const paymentService = new PaymentService();