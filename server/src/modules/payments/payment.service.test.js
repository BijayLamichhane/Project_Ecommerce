import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const paymentFindByTransactionId = vi.fn();
const paymentFindByBookingId = vi.fn();
const paymentUpdate = vi.fn();
const paymentCancelPending = vi.fn();
const bookingServiceCancelPending = vi.fn();
const bookingFindById = vi.fn();
const confirmExpired = vi.fn();
const reserveItems = vi.fn();
const releaseBooking = vi.fn();
const createNotification = vi.fn();
const emitToUser = vi.fn();
const emitAvailability = vi.fn();

vi.mock("./payment.repository.js", () => ({
  paymentRepository: {
    findByTransactionId: paymentFindByTransactionId,
    findByBookingId: paymentFindByBookingId,
    updatePayment: paymentUpdate,
    cancelPendingPayment: paymentCancelPending,
  },
}));

vi.mock("../bookings/booking.repository.js", () => ({
  bookingRepository: {
    findById: bookingFindById,
    confirmExpiredAfterPayment: confirmExpired,
  },
}));

vi.mock("../bookings/booking.service.js", () => ({
  bookingService: {
    cancelPendingForCustomer: bookingServiceCancelPending,
  },
}));

vi.mock("../bookings/booking.inventory.repository.js", () => ({
  bookingInventoryRepository: {
    reserveItems,
    releaseBooking,
    confirmBooking: vi.fn(),
  },
}));

vi.mock("../notifications/notification.service.js", () => ({
  notificationService: {
    createNotification,
  },
}));

vi.mock("../../sockets/index.js", () => ({
  emitToUser,
  emitProductAvailabilityChanged: emitAvailability,
}));

vi.mock("../../config/env.js", () => ({
  env: {
    ESEWA_SECRET_KEY: "test-secret",
    ESEWA_PRODUCT_CODE: "EPAYTEST",
    ESEWA_STATUS_URL: "https://example.test/status",
    ESEWA_CHECKOUT_URL: "https://example.test/checkout",
    BETTER_AUTH_URL: "http://localhost:5000",
    CLIENT_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}));

const { PaymentService } = await import("./payment.service.js");

function signedResponse(fields) {
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const message = signedFieldNames
    .split(",")
    .map((name) => `${name}=${fields[name] ?? ""}`)
    .join(",");
  const signature = crypto
    .createHmac("sha256", "test-secret")
    .update(message)
    .digest("base64");

  return Buffer.from(
    JSON.stringify({
      ...fields,
      signed_field_names: signedFieldNames,
      signature,
      status: "COMPLETE",
    })
  ).toString("base64");
}

describe("PaymentService", () => {
  const payment = {
    id: "payment-1",
    bookingId: "booking-1",
    amount: "100",
    status: "pending",
    paymentGatewayResponse: {},
  };

  const booking = {
    id: "booking-1",
    customerId: "customer-1",
    sellerId: "seller-1",
    status: "expired",
    bookingItems: [
      {
        productId: "product-1",
        quantity: 1,
        startDate: "2026-09-22T00:00:00.000Z",
        endDate: "2026-09-24T00:00:00.000Z",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    paymentFindByTransactionId.mockResolvedValue(payment);
    paymentFindByBookingId.mockResolvedValue(payment);
    bookingFindById.mockResolvedValue(booking);
    bookingServiceCancelPending.mockResolvedValue({
      ...booking,
      status: "cancelled",
    });
    paymentCancelPending.mockResolvedValue({
      ...payment,
      status: "cancelled",
    });
    confirmExpired.mockResolvedValue({
      ...booking,
      status: "confirmed",
    });
    reserveItems.mockResolvedValue({ success: true });
    paymentUpdate.mockResolvedValue({
      ...payment,
      status: "completed",
    });
    createNotification.mockImplementation(async (data) => data);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "COMPLETE" }),
      })
    );
  });

  it("cancels a pending customer payment and booking", async () => {
    bookingFindById.mockResolvedValue({
      ...booking,
      status: "pending",
    });

    const service = new PaymentService();
    const result = await service.cancelPayment(
      "customer-1",
      "booking-1",
      "Changed plans"
    );

    expect(bookingServiceCancelPending).toHaveBeenCalledWith(
      "booking-1",
      "customer-1",
      "Changed plans"
    );
    expect(paymentCancelPending).toHaveBeenCalledWith(
      "payment-1",
      "Changed plans"
    );
    expect(result.booking.status).toBe("cancelled");
    expect(result.payment.status).toBe("cancelled");
  });

  it("does not cancel an already completed payment", async () => {
    bookingFindById.mockResolvedValue({
      ...booking,
      status: "pending",
    });
    paymentFindByBookingId.mockResolvedValue({
      ...payment,
      status: "completed",
    });

    const service = new PaymentService();

    await expect(
      service.cancelPayment("customer-1", "booking-1")
    ).rejects.toThrow("already been completed");

    expect(bookingServiceCancelPending).not.toHaveBeenCalled();
    expect(paymentCancelPending).not.toHaveBeenCalled();
  });

  it("resurrects an expired booking when the dates can still be reserved", async () => {
    const service = new PaymentService();
    const encoded = signedResponse({
      total_amount: "100",
      transaction_uuid: "transaction-1",
      product_code: "EPAYTEST",
    });

    const result = await service.handleEsewaSuccess(encoded);

    expect(reserveItems).toHaveBeenCalledWith(
      "booking-1",
      booking.bookingItems,
      "confirmed",
      null
    );
    expect(confirmExpired).toHaveBeenCalledWith("booking-1");
    expect(paymentUpdate).toHaveBeenCalledWith(
      "payment-1",
      expect.objectContaining({ status: "completed" })
    );
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(result.bookingId).toBe("booking-1");
  });

  it("flags a late payment for refund when the booking was cancelled", async () => {
    bookingFindById.mockResolvedValue({
      ...booking,
      status: "cancelled",
    });

    const service = new PaymentService();
    const encoded = signedResponse({
      total_amount: "100",
      transaction_uuid: "transaction-cancelled",
      product_code: "EPAYTEST",
    });

    await expect(service.handleEsewaSuccess(encoded)).rejects.toThrow(
      "flagged for refund"
    );

    expect(paymentUpdate).toHaveBeenCalledWith(
      "payment-1",
      expect.objectContaining({
        status: "refunded",
        paymentGatewayResponse: expect.objectContaining({
          refundRequired: true,
        }),
      })
    );
    expect(confirmExpired).not.toHaveBeenCalled();
  });

  it("flags the payment for refund when the expired dates were taken", async () => {
    reserveItems.mockRejectedValue(new Error("PRODUCT_UNAVAILABLE:product-1"));

    const service = new PaymentService();
    const encoded = signedResponse({
      total_amount: "100",
      transaction_uuid: "transaction-2",
      product_code: "EPAYTEST",
    });

    await expect(service.handleEsewaSuccess(encoded)).rejects.toThrow(
      "The payment has been flagged for refund"
    );

    expect(paymentUpdate).toHaveBeenCalledWith(
      "payment-1",
      expect.objectContaining({
        status: "refunded",
        paymentGatewayResponse: expect.objectContaining({
          refundRequired: true,
        }),
      })
    );
    expect(confirmExpired).not.toHaveBeenCalled();
  });
});
