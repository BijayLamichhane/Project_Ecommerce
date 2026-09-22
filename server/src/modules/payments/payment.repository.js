import { Payment } from "../../models/Payment.js";

export class PaymentRepository {
  async findByBookingId(bookingId) {
    return Payment.findOne({ bookingId }).lean({ virtuals: true });
  }

  async findByTransactionId(transactionId) {
    return Payment.findOne({ transactionId }).lean({ virtuals: true });
  }

  async findDepositByBookingId(bookingId) {
    return Payment.findOne({ bookingId, type: "security_deposit" }).lean({ virtuals: true });
  }

  async createPayment(data) {
    const payment = await Payment.create(data);
    return payment.toJSON();
  }

  async updatePayment(id, data) {
    return Payment.findByIdAndUpdate(id, { $set: data }, { new: true }).lean({ virtuals: true });
  }

  async cancelPendingPayment(id, reason = "Payment cancelled by customer") {
    return Payment.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        $set: {
          status: "cancelled",
          paymentGatewayResponse: {
            cancellationReason: reason,
            cancelledAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean({ virtuals: true });
  }

  async updateDeposit(id, data) {
    return Payment.findByIdAndUpdate(id, { $set: data }, { new: true }).lean({ virtuals: true });
  }
}
export const paymentRepository = new PaymentRepository();